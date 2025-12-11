"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
import { Textarea } from "@/components/ui/textarea";
import type { OnboardingData } from "@/app/(dashboard)/onboarding/page";

interface CompanyDetailsStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const companySchema = z.object({
  companyNameEn: z.string().min(2, "Company name must be at least 2 characters"),
  companyNameAr: z.string().optional(),
  crNumber: z.string().min(10, "CR number must be at least 10 characters"),
  vatNumber: z.string().min(15, "VAT number must be 15 characters").optional().or(z.literal("")),
  city: z.string().min(1, "Please select a city"),
  address: z.string().min(10, "Address must be at least 10 characters"),
});

type CompanyFormData = z.infer<typeof companySchema>;

const CITIES_SA = [
  "Riyadh",
  "Jeddah",
  "Mecca",
  "Medina",
  "Dammam",
  "Khobar",
  "Dhahran",
  "Jubail",
  "Yanbu",
  "Tabuk",
  "Abha",
  "Jazan",
  "Najran",
  "Hail",
  "Al Kharj",
];

const CITIES_BH = [
  "Manama",
  "Riffa",
  "Muharraq",
  "Hamad Town",
  "Isa Town",
  "Sitra",
  "Budaiya",
  "Jidhafs",
  "Al Hidd",
];

export function CompanyDetailsStep({ data, updateData, onNext, onBack }: CompanyDetailsStepProps) {
  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      companyNameEn: data.companyNameEn,
      companyNameAr: data.companyNameAr,
      crNumber: data.crNumber,
      vatNumber: data.vatNumber,
      city: data.city,
      address: data.address,
    },
  });

  function onSubmit(formData: CompanyFormData) {
    updateData(formData);
    onNext();
  }

  const allCities = [...CITIES_SA.map(c => ({ city: c, country: "SA" })), ...CITIES_BH.map(c => ({ city: c, country: "BH" }))];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Company Name English */}
        <FormField
          control={form.control}
          name="companyNameEn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name (English)</FormLabel>
              <FormControl>
                <Input placeholder="ABC Equipment Rental LLC" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Company Name Arabic */}
        <FormField
          control={form.control}
          name="companyNameAr"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Company Name (Arabic) <span className="text-muted-foreground text-xs">(optional)</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="شركة أ ب ج لتأجير المعدات" dir="rtl" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* CR Number */}
        <FormField
          control={form.control}
          name="crNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Commercial Registration (CR) Number</FormLabel>
              <FormControl>
                <Input placeholder="1010XXXXXX" {...field} />
              </FormControl>
              <FormDescription>
                Your official CR number from the Ministry of Commerce
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* VAT Number */}
        <FormField
          control={form.control}
          name="vatNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                VAT Number <span className="text-muted-foreground text-xs">(optional)</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="300XXXXXXXXXXXX" {...field} />
              </FormControl>
              <FormDescription>
                15-digit VAT registration number (if registered)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* City */}
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your city" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Saudi Arabia
                  </div>
                  {CITIES_SA.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                    Bahrain
                  </div>
                  {CITIES_BH.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Address */}
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Address</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Building name, street, district..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="submit">Continue</Button>
        </div>
      </form>
    </Form>
  );
}
