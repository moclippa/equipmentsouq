"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, MessageSquare, CalendarCheck } from "lucide-react";
import { ContactForm } from "@/components/features/leads/contact-form";
import { BookingRequestForm } from "@/components/features/booking/booking-request-form";
import { useAnalytics } from "@/hooks/use-analytics";
import {
  ListingType,
  EquipmentStatus,
  formatPrice,
  getWhatsAppLink
} from "@/types/equipment";

interface EquipmentPricingCardProps {
  equipmentId: string;
  title: string;
  listingType: ListingType;
  status: EquipmentStatus;
  priceOnRequest: boolean;
  rentalPrice: string | null;
  rentalPriceUnit: string | null;
  salePrice: string | null;
  currency: string;
  contactPhone: string;
  contactWhatsApp: string | null;
  categoryId: string;
  isOwner: boolean;
}

export function EquipmentPricingCard({
  equipmentId,
  title,
  listingType,
  status,
  priceOnRequest,
  rentalPrice,
  rentalPriceUnit,
  salePrice,
  currency,
  contactPhone,
  contactWhatsApp,
  categoryId,
  isOwner,
}: EquipmentPricingCardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { trackEvent } = useAnalytics();

  const whatsappLink = getWhatsAppLink(contactWhatsApp || contactPhone, title);

  return (
    <Card>
      <CardHeader className="pb-2">
        {priceOnRequest ? (
          <div className="text-xl font-semibold text-primary">Contact for Price</div>
        ) : (
          <div className="space-y-2">
            {/* Rental Price */}
            {(listingType === "FOR_RENT" || listingType === "BOTH") && rentalPrice && (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {formatPrice(rentalPrice, currency)}
                </span>
                <span className="text-muted-foreground">/{rentalPriceUnit || "day"}</span>
                {listingType === "BOTH" && (
                  <Badge variant="outline" className="ms-2">
                    Rental
                  </Badge>
                )}
              </div>
            )}

            {/* Sale Price */}
            {(listingType === "FOR_SALE" || listingType === "BOTH") && salePrice && (
              <div className="flex items-baseline gap-2">
                <span
                  className={
                    listingType === "BOTH" ? "text-2xl font-semibold" : "text-3xl font-bold"
                  }
                >
                  {formatPrice(salePrice, currency)}
                </span>
                {listingType === "BOTH" && (
                  <Badge variant="outline" className="ms-2">
                    Buy
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show contact options only for non-owners */}
        {!isOwner && (
          <>
            {/* Not logged in or not verified - show single unified prompt */}
            {!session?.user?.phoneVerified ? (
              <div className="py-6">
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Phone className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {!session ? "Sign in to contact seller" : "Verify your phone"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {!session
                        ? "Create an account to call, WhatsApp, or send inquiries to the owner"
                        : "Verify your phone number to unlock all contact options"}
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() =>
                      router.push(!session ? "/login" : "/settings?verify=phone")
                    }
                  >
                    {!session ? "Sign In to Contact" : "Verify Phone Number"}
                  </Button>
                  {!session && (
                    <p className="text-xs text-muted-foreground">
                      Don&apos;t have an account?{" "}
                      <button
                        onClick={() => router.push("/register")}
                        className="text-primary hover:underline"
                      >
                        Register here
                      </button>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Verified user - show full contact options */}
                <div className="flex gap-2">
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackEvent("WHATSAPP_CLICK", {
                        equipmentId,
                        categoryId,
                        listingType,
                      })
                    }
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#25D366] text-white hover:bg-[#20BD5A] transition-colors font-medium"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={`tel:${contactPhone}`}
                    onClick={() =>
                      trackEvent("CALL_CLICK", {
                        equipmentId,
                        categoryId,
                        listingType,
                      })
                    }
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-input bg-background hover:bg-muted transition-colors font-medium"
                  >
                    <Phone className="w-5 h-5" />
                    <span>Call</span>
                  </a>
                </div>

                <Separator />

                {/* Contact Options - Tabs for Rental, Simple Form for Sale-only */}
                {(listingType === "FOR_RENT" || listingType === "BOTH") &&
                status === "ACTIVE" ? (
                  <Tabs defaultValue="inquiry" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="inquiry" className="text-xs sm:text-sm">
                        <MessageSquare className="w-3.5 h-3.5 me-1.5" />
                        Send Inquiry
                      </TabsTrigger>
                      <TabsTrigger value="booking" className="text-xs sm:text-sm">
                        <CalendarCheck className="w-3.5 h-3.5 me-1.5" />
                        Request Dates
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="inquiry" className="mt-4">
                      <ContactForm
                        equipmentId={equipmentId}
                        equipmentTitle={title}
                        listingType={listingType}
                      />
                    </TabsContent>
                    <TabsContent value="booking" className="mt-4">
                      <BookingRequestForm
                        equipmentId={equipmentId}
                        equipmentTitle={title}
                      />
                    </TabsContent>
                  </Tabs>
                ) : (
                  <ContactForm
                    equipmentId={equipmentId}
                    equipmentTitle={title}
                    listingType={listingType}
                  />
                )}
              </>
            )}
          </>
        )}

        {/* Owner sees a summary instead */}
        {isOwner && (
          <p className="text-sm text-muted-foreground text-center py-2">
            This is how your listing pricing appears to potential buyers
          </p>
        )}
      </CardContent>
    </Card>
  );
}
