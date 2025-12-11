"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface VerificationActionsProps {
  profileId: string;
}

export function VerificationActions({ profileId }: VerificationActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/verifications/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to approve verification");
      }

      router.refresh();
      router.push("/admin/verifications?status=VERIFIED");
    } catch (error) {
      console.error("Approval error:", error);
      alert(error instanceof Error ? error.message : "Failed to approve verification");
    } finally {
      setIsLoading(false);
      setShowApproveDialog(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/verifications/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          rejectionReason: rejectionReason.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reject verification");
      }

      router.refresh();
      router.push("/admin/verifications?status=REJECTED");
    } catch (error) {
      console.error("Rejection error:", error);
      alert(error instanceof Error ? error.message : "Failed to reject verification");
    } finally {
      setIsLoading(false);
      setShowRejectDialog(false);
    }
  };

  return (
    <>
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="text-amber-800">Pending Action</CardTitle>
          <CardDescription>
            Review the documents and business information before making a decision
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full"
            onClick={() => setShowApproveDialog(true)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 me-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 me-2" />
            )}
            Approve Verification
          </Button>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => setShowRejectDialog(true)}
            disabled={isLoading}
          >
            <XCircle className="w-4 h-4 me-2" />
            Reject Verification
          </Button>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Business Verification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this business profile? The user will be notified
              and can start listing equipment on the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 me-2" />
              )}
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Business Verification</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this verification. The user will be able to
              see this reason and can resubmit their documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason">Rejection Reason</Label>
            <Textarea
              id="rejection-reason"
              placeholder="e.g., CR document is expired, company name doesn't match..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isLoading || !rejectionReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 me-2" />
              )}
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
