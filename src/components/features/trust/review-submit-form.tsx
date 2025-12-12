/**
 * Review Submit Form Component
 *
 * Form for submitting reviews after contacting an equipment owner.
 * Includes star rating, title, and comment fields.
 */

"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StarRatingInput } from "./star-rating";
import { Loader2, Send, AlertCircle, CheckCircle } from "lucide-react";
import { VALUE_TO_RATING, RATING_LABELS } from "@/types/trust";
import type { ReviewRating } from "@prisma/client";

// =============================================================================
// SCHEMA
// =============================================================================

const reviewSchema = z.object({
  rating: z.number().min(1, "Please select a rating").max(5),
  title: z.string().max(100, "Title must be under 100 characters").optional(),
  comment: z.string().max(1000, "Comment must be under 1000 characters").optional(),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

// =============================================================================
// TYPES
// =============================================================================

interface ReviewSubmitFormProps {
  /** Lead ID to associate the review with */
  leadId: string;
  /** Equipment title for display */
  equipmentTitle: string;
  /** Owner name for display */
  ownerName: string;
  /** Callback after successful submission */
  onSuccess?: () => void;
  /** Callback on cancel */
  onCancel?: () => void;
  /** Current language */
  lang?: "en" | "ar";
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ReviewSubmitForm({
  leadId,
  equipmentTitle,
  ownerName,
  onSuccess,
  onCancel,
  lang = "en",
}: ReviewSubmitFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      title: "",
      comment: "",
    },
  });

  const ratingValue = watch("rating");
  const ratingLabel = ratingValue
    ? RATING_LABELS[VALUE_TO_RATING[ratingValue] as ReviewRating]
    : null;

  const handleRatingChange = useCallback(
    (value: number) => {
      setValue("rating", value, { shouldValidate: true });
    },
    [setValue]
  );

  const onSubmit = async (data: ReviewFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          rating: VALUE_TO_RATING[data.rating],
          title: data.title || undefined,
          comment: data.comment || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit review");
      }

      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (success) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {lang === "ar" ? "تم إرسال تقييمك!" : "Review Submitted!"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {lang === "ar"
              ? "شكراً لمشاركة تجربتك. تقييمك يساعد الآخرين في اتخاذ قرارات أفضل."
              : "Thank you for sharing your experience. Your review helps others make better decisions."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {lang === "ar" ? "كيف كانت تجربتك؟" : "How was your experience?"}
        </CardTitle>
        <CardDescription>
          {lang === "ar"
            ? `شارك رأيك عن تجربتك مع ${ownerName} بخصوص ${equipmentTitle}`
            : `Share your feedback about your interaction with ${ownerName} regarding ${equipmentTitle}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Star Rating */}
          <div className="space-y-2">
            <Label>
              {lang === "ar" ? "التقييم العام" : "Overall Rating"}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-col items-center gap-2 py-4">
              <StarRatingInput
                value={ratingValue}
                onChange={handleRatingChange}
                size="lg"
              />
              {ratingLabel && (
                <span className="text-sm font-medium text-primary">
                  {lang === "ar" ? ratingLabel.ar : ratingLabel.en}
                </span>
              )}
            </div>
            {errors.rating && (
              <p className="text-sm text-destructive">{errors.rating.message}</p>
            )}
          </div>

          {/* Title (optional) */}
          <div className="space-y-2">
            <Label htmlFor="title">
              {lang === "ar" ? "عنوان التقييم (اختياري)" : "Review Title (optional)"}
            </Label>
            <Input
              id="title"
              placeholder={
                lang === "ar"
                  ? "ملخص قصير لتجربتك"
                  : "Brief summary of your experience"
              }
              {...register("title")}
              maxLength={100}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Comment (optional) */}
          <div className="space-y-2">
            <Label htmlFor="comment">
              {lang === "ar" ? "تفاصيل إضافية (اختياري)" : "Additional Details (optional)"}
            </Label>
            <Textarea
              id="comment"
              placeholder={
                lang === "ar"
                  ? "شارك المزيد من التفاصيل عن تجربتك مع هذا المالك..."
                  : "Share more details about your experience with this owner..."
              }
              {...register("comment")}
              rows={4}
              maxLength={1000}
            />
            {errors.comment && (
              <p className="text-sm text-destructive">{errors.comment.message}</p>
            )}
          </div>

          {/* Guidelines */}
          <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">
              {lang === "ar" ? "إرشادات التقييم:" : "Review Guidelines:"}
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>
                {lang === "ar"
                  ? "كن صادقاً وموضوعياً في تقييمك"
                  : "Be honest and objective in your review"}
              </li>
              <li>
                {lang === "ar"
                  ? "ركز على تجربتك الفعلية مع المالك"
                  : "Focus on your actual experience with the owner"}
              </li>
              <li>
                {lang === "ar"
                  ? "تجنب اللغة المسيئة أو المحتوى غير اللائق"
                  : "Avoid offensive language or inappropriate content"}
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting || ratingValue === 0}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {lang === "ar" ? "جاري الإرسال..." : "Submitting..."}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 me-2" />
                  {lang === "ar" ? "إرسال التقييم" : "Submit Review"}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// OWNER RESPONSE FORM
// =============================================================================

interface OwnerResponseFormProps {
  /** Review ID to respond to */
  reviewId: string;
  /** Callback after successful submission */
  onSuccess?: () => void;
  /** Current language */
  lang?: "en" | "ar";
}

const responseSchema = z.object({
  response: z
    .string()
    .min(10, "Response must be at least 10 characters")
    .max(500, "Response must be under 500 characters"),
});

type ResponseFormData = z.infer<typeof responseSchema>;

export function OwnerResponseForm({
  reviewId,
  onSuccess,
  lang = "en",
}: OwnerResponseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResponseFormData>({
    resolver: zodResolver(responseSchema),
  });

  const onSubmit = async (data: ResponseFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: data.response }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit response");
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="response">
          {lang === "ar" ? "ردك على هذا التقييم" : "Your Response"}
        </Label>
        <Textarea
          id="response"
          placeholder={
            lang === "ar"
              ? "اكتب رداً مهنياً على هذا التقييم..."
              : "Write a professional response to this review..."
          }
          {...register("response")}
          rows={3}
          maxLength={500}
        />
        {errors.response && (
          <p className="text-sm text-destructive">{errors.response.message}</p>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 me-2 animate-spin" />
              {lang === "ar" ? "جاري الإرسال..." : "Submitting..."}
            </>
          ) : (
            lang === "ar" ? "إرسال الرد" : "Submit Response"
          )}
        </Button>
      </div>
    </form>
  );
}
