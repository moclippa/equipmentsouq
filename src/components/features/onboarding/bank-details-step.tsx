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
import { Shield } from "lucide-react";
import type { OnboardingData } from "@/app/(dashboard)/onboarding/page";

interface BankDetailsStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

// IBAN validation: SA IBANs are 24 characters, BH IBANs are 22 characters
const bankSchema = z.object({
  bankName: z.string().min(1, "Please select a bank"),
  accountHolderName: z.string().min(2, "Account holder name is required"),
  iban: z
    .string()
    .min(22, "IBAN must be at least 22 characters")
    .max(24, "IBAN must be at most 24 characters")
    .regex(/^(SA|BH)[0-9A-Z]+$/, "IBAN must start with SA or BH followed by numbers/letters"),
});

type BankFormData = z.infer<typeof bankSchema>;

const BANKS_SA = [
  "Al Rajhi Bank",
  "Saudi National Bank (SNB)",
  "Riyad Bank",
  "Saudi British Bank (SABB)",
  "Banque Saudi Fransi",
  "Arab National Bank",
  "Alinma Bank",
  "Bank AlJazira",
  "Bank Albilad",
  "Gulf International Bank",
];

const BANKS_BH = [
  "Bank of Bahrain and Kuwait (BBK)",
  "National Bank of Bahrain",
  "Ahli United Bank",
  "Bahrain Islamic Bank",
  "Kuwait Finance House Bahrain",
  "Al Salam Bank",
  "Ithmaar Bank",
];

export function BankDetailsStep({ data, updateData, onNext, onBack }: BankDetailsStepProps) {
  const form = useForm<BankFormData>({
    resolver: zodResolver(bankSchema),
    defaultValues: {
      bankName: data.bankName,
      accountHolderName: data.accountHolderName,
      iban: data.iban,
    },
  });

  function onSubmit(formData: BankFormData) {
    updateData(formData);
    onNext();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm flex gap-3">
          <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800 mb-1">Your information is secure</p>
            <p className="text-blue-700">
              Bank details are encrypted and only used to process payouts for completed rentals.
              We never share your banking information with renters.
            </p>
          </div>
        </div>

        {/* Bank Name */}
        <FormField
          control={form.control}
          name="bankName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bank Name</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your bank" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Saudi Arabia
                  </div>
                  {BANKS_SA.map((bank) => (
                    <SelectItem key={bank} value={bank}>
                      {bank}
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                    Bahrain
                  </div>
                  {BANKS_BH.map((bank) => (
                    <SelectItem key={bank} value={bank}>
                      {bank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Account Holder Name */}
        <FormField
          control={form.control}
          name="accountHolderName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Holder Name</FormLabel>
              <FormControl>
                <Input placeholder="Name as it appears on bank account" {...field} />
              </FormControl>
              <FormDescription>
                Must match the name on your bank account exactly
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* IBAN */}
        <FormField
          control={form.control}
          name="iban"
          render={({ field }) => (
            <FormItem>
              <FormLabel>IBAN</FormLabel>
              <FormControl>
                <Input
                  placeholder="SA0000000000000000000000"
                  {...field}
                  onChange={(e) => {
                    // Auto-format: uppercase and remove spaces
                    const value = e.target.value.toUpperCase().replace(/\s/g, "");
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <FormDescription>
                SA IBANs: 24 characters | BH IBANs: 22 characters
              </FormDescription>
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
