"use client";

import { useState, forwardRef } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Smartphone, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const phoneSchema = z.object({
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(
      /^\+?(966|973)[0-9]{8,9}$/,
      "Enter a valid KSA (+966) or Bahrain (+973) number"
    ),
});

type PhoneFormData = z.infer<typeof phoneSchema>;

interface PhoneVerificationCardProps {
  className?: string;
}

export const PhoneVerificationCard = forwardRef<HTMLDivElement, PhoneVerificationCardProps>(
  function PhoneVerificationCard({ className }, ref) {
    const { data: session, update: updateSession } = useSession();
    const [phoneStep, setPhoneStep] = useState<"input" | "verify">("input");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [otpError, setOtpError] = useState("");

    const isPhoneVerified = session?.user?.phoneVerified;

    const phoneForm = useForm<PhoneFormData>({
      resolver: zodResolver(phoneSchema),
      defaultValues: {
        phone: session?.user?.phone || "",
      },
    });

    async function handleSendOtp(data: PhoneFormData) {
      setIsSendingOtp(true);
      setOtpError("");
      try {
        let phone = data.phone.replace(/\s/g, "");
        if (!phone.startsWith("+")) {
          phone = "+" + phone;
        }

        const response = await fetch("/api/auth/otp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, type: "VERIFY" }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to send OTP");
        }

        setPhoneNumber(phone);
        setPhoneStep("verify");
        toast.success("Verification code sent!");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to send code");
      } finally {
        setIsSendingOtp(false);
      }
    }

    async function handleVerifyOtp() {
      if (otpCode.length !== 6) {
        setOtpError("Please enter a 6-digit code");
        return;
      }

      setIsVerifyingOtp(true);
      setOtpError("");
      try {
        const response = await fetch("/api/auth/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phoneNumber, code: otpCode }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Invalid code");
        }

        toast.success("Phone number verified!");
        setPhoneStep("input");
        setOtpCode("");
        await updateSession({});
        window.location.href = "/settings";
      } catch (error) {
        setOtpError(error instanceof Error ? error.message : "Invalid code");
      } finally {
        setIsVerifyingOtp(false);
      }
    }

    return (
      <Card ref={ref} className={`transition-all duration-300 ${className || ""}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Phone Verification
              </CardTitle>
              <CardDescription>
                Verify your phone number to list equipment and contact sellers
              </CardDescription>
            </div>
            {isPhoneVerified ? (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle2 className="h-3 w-3 me-1" />
                Verified
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                <AlertCircle className="h-3 w-3 me-1" />
                Not Verified
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isPhoneVerified ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Your phone number ({session?.user?.phone}) is verified
            </div>
          ) : phoneStep === "input" ? (
            <Form {...phoneForm}>
              <form onSubmit={phoneForm.handleSubmit(handleSendOtp)} className="space-y-4">
                <FormField
                  control={phoneForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+966XXXXXXXXX or +973XXXXXXXX" {...field} />
                      </FormControl>
                      <FormDescription>
                        Enter your KSA (+966) or Bahrain (+973) phone number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isSendingOtp}>
                  {isSendingOtp ? (
                    <>
                      <Loader2 className="h-4 w-4 me-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Verification Code"
                  )}
                </Button>
              </form>
            </Form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to {phoneNumber}
              </p>
              <div className="space-y-2">
                <Input
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtpCode(value);
                    setOtpError("");
                  }}
                  className="text-center text-lg tracking-widest"
                  maxLength={6}
                />
                {otpError && <p className="text-sm text-destructive">{otpError}</p>}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleVerifyOtp} disabled={isVerifyingOtp}>
                  {isVerifyingOtp ? (
                    <>
                      <Loader2 className="h-4 w-4 me-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Code"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setPhoneStep("input");
                    setOtpCode("");
                    setOtpError("");
                  }}
                >
                  Change Number
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Didn&apos;t receive the code?{" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => phoneForm.handleSubmit(handleSendOtp)()}
                >
                  Resend
                </button>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);
