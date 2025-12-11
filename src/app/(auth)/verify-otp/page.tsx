"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

function VerifyOTPContent() {
  const t = useTranslations("auth.otp");
  const tErrors = useTranslations("auth.errors");
  const router = useRouter();
  const searchParams = useSearchParams();

  const phone = searchParams.get("phone") || "";
  const type = searchParams.get("type") || "login";

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if no phone number
  useEffect(() => {
    if (!phone) {
      router.push("/login");
    }
  }, [phone, router]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle input change
  function handleChange(index: number, value: string) {
    // Only allow numbers
    const digit = value.replace(/[^0-9]/g, "").slice(-1);

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-focus next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (digit && index === OTP_LENGTH - 1) {
      const fullOtp = newOtp.join("");
      if (fullOtp.length === OTP_LENGTH) {
        handleVerify(fullOtp);
      }
    }
  }

  // Handle backspace
  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  // Handle paste
  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, OTP_LENGTH);
    const newOtp = [...otp];

    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }

    setOtp(newOtp);

    // Focus last filled input or next empty one
    const focusIndex = Math.min(pastedData.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();

    // Auto-submit if complete
    if (pastedData.length === OTP_LENGTH) {
      handleVerify(pastedData);
    }
  }

  // Verify OTP
  async function handleVerify(code?: string) {
    const otpCode = code || otp.join("");
    if (otpCode.length !== OTP_LENGTH) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn("phone-otp", {
        phone,
        code: otpCode,
        redirect: false,
      });

      if (result?.error) {
        toast.error(tErrors("invalidOTP"));
        // Clear OTP inputs
        setOtp(Array(OTP_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
        return;
      }

      toast.success("Welcome!");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // Resend OTP
  async function handleResend() {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          type: type === "login" ? "LOGIN" : "VERIFICATION"
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error?.includes("Too many")) {
          toast.error(tErrors("tooManyAttempts"));
        } else {
          toast.error(result.error || "Failed to resend code");
        }
        return;
      }

      toast.success("New code sent!");
      setResendCooldown(RESEND_COOLDOWN);
      setOtp(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch {
      toast.error("Failed to resend code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // Format phone for display
  const displayPhone = phone.replace(/(\+\d{3})(\d{2})(\d{3})(\d{4})/, "$1 $2 $3 $4");

  if (!phone) return null;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t("title")}</CardTitle>
        <CardDescription>
          {t("subtitle", { phone: displayPhone })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* OTP Input */}
        <div className="flex justify-center gap-2">
          {otp.map((digit, index) => (
            <Input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className="w-12 h-12 text-center text-xl font-semibold"
              disabled={isLoading}
            />
          ))}
        </div>

        {/* Verify Button */}
        <Button
          onClick={() => handleVerify()}
          className="w-full"
          disabled={isLoading || otp.join("").length !== OTP_LENGTH}
        >
          {isLoading ? "Verifying..." : t("verify")}
        </Button>

        {/* Resend */}
        <div className="text-center text-sm">
          <p className="text-muted-foreground mb-2">{t("didntReceive")}</p>
          {resendCooldown > 0 ? (
            <p className="text-muted-foreground">
              {t("resendIn", { seconds: resendCooldown })}
            </p>
          ) : (
            <Button
              variant="link"
              onClick={handleResend}
              disabled={isLoading}
              className="p-0 h-auto"
            >
              {t("resend")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={
      <Card>
        <CardContent className="p-8 text-center">
          Loading...
        </CardContent>
      </Card>
    }>
      <VerifyOTPContent />
    </Suspense>
  );
}
