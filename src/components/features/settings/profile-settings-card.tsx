"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
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
import { User, Loader2, Pencil, X } from "lucide-react";

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

interface ProfileSettingsCardProps {
  className?: string;
}

export function ProfileSettingsCard({ className }: ProfileSettingsCardProps) {
  const { data: session, update: updateSession } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: session?.user?.fullName || "",
      fullNameAr: "",
      preferredLanguage: (session?.user?.preferredLanguage as "en" | "ar") || "en",
      country: (session?.user?.country as "SA" | "BH") || "SA",
    },
  });

  // Update form when session loads
  useEffect(() => {
    if (session?.user) {
      form.reset({
        fullName: session.user.fullName || "",
        fullNameAr: "",
        preferredLanguage: (session.user.preferredLanguage as "en" | "ar") || "en",
        country: (session.user.country as "SA" | "BH") || "SA",
      });
    }
  }, [session, form]);

  async function onSubmit(data: ProfileFormData) {
    setIsSubmitting(true);
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
      setIsEditing(false);
      await updateSession({});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className={className}>
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
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4 me-1" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
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
                control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
                          <SelectItem value="SA">Saudi Arabia</SelectItem>
                          <SelectItem value="BH">Bahrain</SelectItem>
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
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
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
                    setIsEditing(false);
                    form.reset();
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
              <p className="mt-1">{session?.user?.country === "BH" ? "Bahrain" : "Saudi Arabia"}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
