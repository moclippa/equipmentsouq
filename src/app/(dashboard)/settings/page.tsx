"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { User, Lock, Building2, Smartphone, CheckCircle2, AlertCircle, Loader2, Pencil, X } from "lucide-react";
import Link from "next/link";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

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

const profileSchema = z.object({
  fullName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  fullNameAr: z
    .string()
    .max(100, "Arabic name must be less than 100 characters")
    .optional(),
  preferredLanguage: z.enum(["en", "ar"]),
  country: z.enum(["SA", "BH"]),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const phoneCardRef = useRef<HTMLDivElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneStep, setPhoneStep] = useState<"input" | "verify">("input");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phone: session?.user?.phone || "",
    },
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: session?.user?.fullName || "",
      fullNameAr: "",
      preferredLanguage: (session?.user?.preferredLanguage as "en" | "ar") || "en",
      country: (session?.user?.country as "SA" | "BH") || "SA",
    },
  });

  // Scroll to phone card if ?verify=phone
  useEffect(() => {
    if (searchParams.get("verify") === "phone" && phoneCardRef.current) {
      phoneCardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      phoneCardRef.current.classList.add("ring-2", "ring-primary", "ring-offset-2");
      setTimeout(() => {
        phoneCardRef.current?.classList.remove("ring-2", "ring-primary", "ring-offset-2");
      }, 3000);
    }
  }, [searchParams]);

  // Update phone form when session loads
  useEffect(() => {
    if (session?.user?.phone) {
      phoneForm.setValue("phone", session.user.phone);
    }
  }, [session, phoneForm]);

  // Update profile form when session loads
  useEffect(() => {
    if (session?.user) {
      profileForm.reset({
        fullName: session.user.fullName || "",
        fullNameAr: "",
        preferredLanguage: (session.user.preferredLanguage as "en" | "ar") || "en",
        country: (session.user.country as "SA" | "BH") || "SA",
      });
    }
  }, [session, profileForm]);

  const isPhoneVerified = session?.user?.phoneVerified;

  async function onProfileSubmit(data: ProfileFormData) {
    setIsUpdatingProfile(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update profile");
      }

      toast.success("Profile updated successfully");
      setIsEditingProfile(false);
      // Update session to reflect changes
      await updateSession({});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsUpdatingProfile(false);
    }
  }

  async function onSubmit(data: PasswordFormData) {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to change password");
      }

      toast.success("Password changed successfully");
      form.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendOtp(data: PhoneFormData) {
    setIsSendingOtp(true);
    setOtpError("");
    try {
      // Format phone number
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
      // Update session JWT with new phoneVerified status from DB
      await updateSession({});
      // Force page reload to reflect updated session
      window.location.href = "/settings";
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : "Invalid code");
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-6">
        {/* Account Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Account Information
                </CardTitle>
                <CardDescription>
                  Your basic account details
                </CardDescription>
              </div>
              {!isEditingProfile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingProfile(true)}
                >
                  <Pencil className="h-4 w-4 me-1" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditingProfile ? (
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="fullNameAr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name (Arabic)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="الاسم الكامل (اختياري)"
                            dir="rtl"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Optional - displayed in Arabic UI
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={profileForm.control}
                      name="preferredLanguage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Language</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="ar">العربية (Arabic)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="SA">Saudi Arabia 🇸🇦</SelectItem>
                              <SelectItem value="BH">Bahrain 🇧🇭</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Currency will update to match
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong>Email:</strong> {session?.user?.email || "Not set"}</p>
                    <p><strong>Phone:</strong> {session?.user?.phone || "Not set"}</p>
                    <p className="text-xs">To change email or phone, please contact support.</p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button type="submit" disabled={isUpdatingProfile}>
                      {isUpdatingProfile ? (
                        <>
                          <Loader2 className="h-4 w-4 me-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setIsEditingProfile(false);
                        profileForm.reset();
                      }}
                    >
                      <X className="h-4 w-4 me-1" />
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="mt-1">{session?.user?.fullName || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="mt-1">{session?.user?.email || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p className="mt-1">{session?.user?.phone || "Not set"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Role</label>
                  <p className="mt-1 capitalize">{session?.user?.role?.toLowerCase() || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Language</label>
                  <p className="mt-1">{session?.user?.preferredLanguage === "ar" ? "العربية" : "English"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Country</label>
                  <p className="mt-1">{session?.user?.country === "BH" ? "Bahrain 🇧🇭" : "Saudi Arabia 🇸🇦"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Phone Verification */}
        <Card ref={phoneCardRef} className="transition-all duration-300">
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
                          <Input
                            placeholder="+966XXXXXXXXX or +973XXXXXXXX"
                            {...field}
                          />
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
                  {otpError && (
                    <p className="text-sm text-destructive">{otpError}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleVerifyOtp} disabled={isVerifyingOtp}>
                    {isVerifyingOtp ? (
                      <>
                        <Loader2 className="h-4 w-4 me-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify"
                    )}
                  </Button>
                  <Button
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter current password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter new password" {...field} />
                      </FormControl>
                      <FormDescription>
                        At least 8 characters with uppercase, lowercase, and number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Changing..." : "Change Password"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Business Profile Link */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Business Profile
            </CardTitle>
            <CardDescription>
              View and manage your business verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/settings/business">
                View Business Profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
