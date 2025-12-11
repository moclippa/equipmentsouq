"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, LogIn, Smartphone, Phone } from "lucide-react";

const contactSchema = z.object({
  message: z.string().max(1000).optional(),
  interestedIn: z.enum(["rent", "buy", "both"]),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactFormProps {
  equipmentId: string;
  equipmentTitle: string;
  listingType: "FOR_RENT" | "FOR_SALE" | "BOTH";
}

export function ContactForm({
  equipmentId,
  equipmentTitle,
  listingType,
}: ContactFormProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [ownerContact, setOwnerContact] = useState<{
    phone: string;
    name: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsPhoneVerification, setNeedsPhoneVerification] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      interestedIn: listingType === "FOR_SALE" ? "buy" : "rent",
    },
  });

  const interestedIn = watch("interestedIn");

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    setError(null);
    setNeedsPhoneVerification(false);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          equipmentId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle phone verification required
        if (result.code === "PHONE_NOT_VERIFIED") {
          setNeedsPhoneVerification(true);
          return;
        }
        throw new Error(result.error || "Failed to submit");
      }

      setIsSuccess(true);
      setOwnerContact(result.contact);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format WhatsApp link for success state
  const getWhatsAppLink = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Hi, I'm interested in your ${equipmentTitle} listing on EquipmentSouq.`
    );
    return `https://wa.me/${cleanPhone}?text=${message}`;
  };

  // Not logged in - prompt to login
  if (status === "unauthenticated") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contact Owner</CardTitle>
          <CardDescription>
            Login to contact the equipment owner
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <LogIn className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Please login with your phone number to contact equipment owners
            </p>
            <Button onClick={() => router.push("/login")} className="w-full">
              Login to Contact
            </Button>
          </div>

        </CardContent>
      </Card>
    );
  }

  // Loading session
  if (status === "loading") {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-pulse">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  // Phone verification required
  if (needsPhoneVerification) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle>Phone Verification Required</CardTitle>
          <CardDescription>
            Verify your phone to contact equipment owners
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <Smartphone className="w-6 h-6 text-amber-600" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              To protect our community from spam, please verify your phone number before contacting sellers.
            </p>
            <Button
              onClick={() => router.push("/settings?verify=phone")}
              className="w-full"
            >
              Verify Phone Number
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success state
  if (isSuccess && ownerContact) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Contact Submitted!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                The owner has been notified. You can also contact them directly:
              </p>
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <a
                href={getWhatsAppLink(ownerContact.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#25D366] text-white hover:bg-[#20BD5A] transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span>WhatsApp {ownerContact.name}</span>
              </a>
              <a
                href={`tel:${ownerContact.phone}`}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-input bg-background hover:bg-muted transition-colors"
              >
                <Phone className="w-5 h-5" />
                <span>Call</span>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Logged in user - show simplified form
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Owner</CardTitle>
        <CardDescription>
          Your contact info ({session?.user?.phone}) will be shared with the owner
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {listingType === "BOTH" && (
            <div className="space-y-2">
              <Label>I&apos;m interested in</Label>
              <Select
                value={interestedIn}
                onValueChange={(value) =>
                  setValue("interestedIn", value as "rent" | "buy" | "both")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rent">Renting</SelectItem>
                  <SelectItem value="buy">Buying</SelectItem>
                  <SelectItem value="both">Both options</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Any specific questions or requirements?"
              rows={3}
              {...register("message")}
            />
            {errors.message && (
              <p className="text-sm text-destructive">
                {errors.message.message}
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Contact Owner"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
