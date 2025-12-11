"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Email login schema
const emailSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

// Phone login schema
const phoneSchema = z.object({
  phone: z.string().regex(/^\+966[0-9]{9}$|^\+973[0-9]{8}$/, "Invalid KSA or Bahrain phone number"),
});

type EmailFormData = z.infer<typeof emailSchema>;
type PhoneFormData = z.infer<typeof phoneSchema>;

export default function LoginPage() {
  const t = useTranslations("auth.login");
  const tErrors = useTranslations("auth.errors");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"email" | "phone">("email");

  // Email form
  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "", password: "" },
  });

  // Phone form
  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
  });

  // Handle email/password login
  async function onEmailSubmit(data: EmailFormData) {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        // Map error messages
        if (result.error.includes("suspended")) {
          toast.error(tErrors("accountSuspended"));
        } else if (result.error.includes("deactivated")) {
          toast.error(tErrors("accountDeactivated"));
        } else {
          toast.error(tErrors("invalidCredentials"));
        }
        return;
      }

      toast.success("Welcome back!");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error(tErrors("invalidCredentials"));
    } finally {
      setIsLoading(false);
    }
  }

  // Handle phone OTP request
  async function onPhoneSubmit(data: PhoneFormData) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: data.phone, type: "LOGIN" }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error?.includes("Too many")) {
          toast.error(tErrors("tooManyAttempts"));
        } else {
          toast.error(result.error || "Failed to send OTP");
        }
        return;
      }

      // Redirect to OTP verification page
      router.push(`/verify-otp?phone=${encodeURIComponent(data.phone)}&type=login`);
    } catch {
      toast.error("Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "email" | "phone")}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="email">{t("signInWithEmail")}</TabsTrigger>
            <TabsTrigger value="phone">{t("signInWithPhone")}</TabsTrigger>
          </TabsList>

          {/* Email/Password Tab */}
          <TabsContent value="email">
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("email")}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="name@example.com"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={emailForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>{t("password")}</FormLabel>
                        <Link
                          href="/forgot-password"
                          className="text-sm text-muted-foreground hover:text-primary"
                        >
                          {t("forgotPassword")}
                        </Link>
                      </div>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="current-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "..." : t("signIn")}
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* Phone/OTP Tab */}
          <TabsContent value="phone">
            <Form {...phoneForm}>
              <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
                <FormField
                  control={phoneForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("phone")}</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+966 5XX XXX XXX"
                          dir="ltr"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        KSA: +966 5XXXXXXXX | Bahrain: +973 XXXXXXXX
                      </p>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "..." : t("sendOTP")}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="text-sm text-center text-muted-foreground">
          {t("noAccount")}{" "}
          <Link href="/register" className="text-primary hover:underline font-medium">
            {t("createAccount")}
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
