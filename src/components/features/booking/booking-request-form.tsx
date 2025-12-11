"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DateRangePicker } from "@/components/features/search/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { CalendarClock, Loader2, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingRequestFormProps {
  equipmentId: string;
  equipmentTitle: string;
  className?: string;
  onSuccess?: () => void;
}

export function BookingRequestForm({
  equipmentId,
  equipmentTitle,
  className,
  onSuccess,
}: BookingRequestFormProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [name, setName] = useState(session?.user?.fullName || "");
  const [phone, setPhone] = useState(session?.user?.phone || "");
  const [email, setEmail] = useState(session?.user?.email || "");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!dateRange?.from || !dateRange?.to) {
      setError("Please select a date range");
      return;
    }

    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    if (!phone.trim()) {
      setError("Please enter your phone number");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/booking-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipmentId,
          startDate: format(dateRange.from, "yyyy-MM-dd"),
          endDate: format(dateRange.to, "yyyy-MM-dd"),
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          message: message.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit booking request");
      }

      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <Card className={cn("border-green-200 bg-green-50", className)}>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
            <div>
              <h3 className="font-semibold text-lg text-green-900">
                Request Submitted!
              </h3>
              <p className="text-sm text-green-700 mt-1">
                The owner has 48 hours to respond to your booking request.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-green-600">
              <Clock className="w-4 h-4" />
              <span>We&apos;ll notify you when they respond</span>
            </div>
            {session?.user && (
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/booking-requests")}
              >
                View My Requests
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Request to Book</CardTitle>
        </div>
        <CardDescription>
          Select your dates and the owner will confirm within 48 hours
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date Range */}
          <div className="space-y-2">
            <Label>When do you need it?</Label>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder="Select rental dates"
            />
          </div>

          {/* Contact Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+966 5XX XXX XXXX"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell the owner about your project or any special requirements..."
              rows={3}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !dateRange?.from || !dateRange?.to}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Request Booking"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            By submitting, you agree to share your contact info with the equipment owner.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
