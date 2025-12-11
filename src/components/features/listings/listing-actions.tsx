"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Edit, MoreHorizontal, Loader2, EyeOff, Eye, CheckCircle, XCircle } from "lucide-react";

interface ListingActionsProps {
  listingId: string;
  status: string;
  leadCount: number;
}

export function ListingActions({ listingId, status, leadCount }: ListingActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/equipment/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      router.refresh();
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update listing status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/equipment/${listingId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      router.refresh();
    } catch (error) {
      console.error("Failed to delete:", error);
      alert("Failed to delete listing");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/my-listings/${listingId}/edit`}>
            <Edit className="w-4 h-4 me-1" />
            Edit
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" disabled={isUpdating}>
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MoreHorizontal className="w-4 h-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/equipment/${listingId}`}>
                View Listing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/my-listings/${listingId}/leads`}>
                View Leads ({leadCount})
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* Show "Show Listing" for PAUSED listings */}
            {status === "PAUSED" && (
              <DropdownMenuItem onClick={() => handleStatusChange("ACTIVE")}>
                <Eye className="w-4 h-4 me-2" />
                Show Listing
              </DropdownMenuItem>
            )}
            {/* Show "Mark as Available" for RENTED or SOLD listings */}
            {(status === "RENTED" || status === "SOLD") && (
              <DropdownMenuItem onClick={() => handleStatusChange("ACTIVE")}>
                <CheckCircle className="w-4 h-4 me-2 text-green-600" />
                Mark as Available
              </DropdownMenuItem>
            )}
            {/* Hide Listing - available for all statuses except PAUSED */}
            {status !== "PAUSED" && (
              <DropdownMenuItem onClick={() => handleStatusChange("PAUSED")}>
                <EyeOff className="w-4 h-4 me-2" />
                Hide Listing
              </DropdownMenuItem>
            )}
            {status !== "SOLD" && status !== "RENTED" && (
              <DropdownMenuItem onClick={() => handleStatusChange("SOLD")}>
                <XCircle className="w-4 h-4 me-2 text-blue-600" />
                Mark as Sold
              </DropdownMenuItem>
            )}
            {status !== "RENTED" && status !== "SOLD" && (
              <DropdownMenuItem onClick={() => handleStatusChange("RENTED")}>
                <XCircle className="w-4 h-4 me-2 text-purple-600" />
                Mark as Rented
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              Delete Listing
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive your listing. It will no longer be visible to others,
              but you can still view it in your archived listings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
