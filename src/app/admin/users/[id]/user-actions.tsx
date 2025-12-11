"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Ban, CheckCircle, Shield } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  fullName: string;
  role: string;
  isSuspended: boolean;
}

interface UserActionsProps {
  user: User;
}

export function UserActions({ user }: UserActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [newRole, setNewRole] = useState(user.role);

  const handleSuspend = async () => {
    if (!suspendReason.trim()) {
      toast.error("Please provide a reason for suspension");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: suspendReason }),
      });

      if (!response.ok) {
        throw new Error("Failed to suspend user");
      }

      toast.success(`${user.fullName} has been suspended`);
      setSuspendDialogOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to suspend user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactivate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/reactivate`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to reactivate user");
      }

      toast.success(`${user.fullName} has been reactivated`);
      router.refresh();
    } catch {
      toast.error("Failed to reactivate user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (newRole === user.role) {
      setRoleDialogOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error("Failed to update role");
      }

      toast.success(`Role updated to ${newRole}`);
      setRoleDialogOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to update role");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Change Role */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Shield className="w-4 h-4 me-2" />
            Change Role
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {user.fullName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="role">New Role</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GUEST">Guest</SelectItem>
                <SelectItem value="RENTER">Renter</SelectItem>
                <SelectItem value="OWNER">Owner</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRoleChange} disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend / Reactivate */}
      {user.isSuspended ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleReactivate}
          disabled={isLoading}
        >
          <CheckCircle className="w-4 h-4 me-2" />
          {isLoading ? "Reactivating..." : "Reactivate"}
        </Button>
      ) : (
        <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Ban className="w-4 h-4 me-2" />
              Suspend
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Suspend User</DialogTitle>
              <DialogDescription>
                This will prevent {user.fullName} from accessing their account.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="reason">Reason for Suspension</Label>
              <Textarea
                id="reason"
                placeholder="Enter the reason for suspending this user..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSuspendDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleSuspend}
                disabled={isLoading || !suspendReason.trim()}
              >
                {isLoading ? "Suspending..." : "Suspend User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
