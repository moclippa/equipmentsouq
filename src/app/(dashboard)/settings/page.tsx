"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  ProfileSettingsCard,
  PhoneVerificationCard,
  PasswordChangeCard,
  BusinessProfileCard,
} from "@/components/features/settings";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const phoneCardRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-6">
        <ProfileSettingsCard />
        <PhoneVerificationCard ref={phoneCardRef} />
        <PasswordChangeCard />
        <BusinessProfileCard />
      </div>
    </div>
  );
}
