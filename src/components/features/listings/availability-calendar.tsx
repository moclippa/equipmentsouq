"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Trash2,
  CalendarDays,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  EyeOff,
  Calendar as CalendarIcon
} from "lucide-react";
import { format, isWithinInterval, addMonths, startOfMonth, endOfMonth } from "date-fns";

interface AvailabilityBlock {
  id: string;
  startDate: string;
  endDate: string;
  isAvailable: boolean;
  reason: string | null;
}

interface AvailabilityCalendarProps {
  equipmentId: string;
  listingStatus?: string;
  onStatusChange?: (status: string) => void;
}

export function AvailabilityCalendar({
  equipmentId,
  listingStatus,
  onStatusChange
}: AvailabilityCalendarProps) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedRange, setSelectedRange] = useState<{ from: Date; to?: Date } | undefined>();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [blockType, setBlockType] = useState<"unavailable" | "available">("unavailable");
  const [reason, setReason] = useState("");
  const [month, setMonth] = useState<Date>(new Date());

  // Fetch blocks
  useEffect(() => {
    async function fetchBlocks() {
      try {
        const res = await fetch(`/api/equipment/${equipmentId}/availability`);
        const data = await res.json();
        setBlocks(data.blocks || []);
      } catch (error) {
        console.error("Failed to fetch availability:", error);
        toast.error("Failed to load availability calendar");
      } finally {
        setIsLoading(false);
      }
    }
    fetchBlocks();
  }, [equipmentId]);

  // Check if a date falls within any block
  const getBlockForDate = (date: Date): AvailabilityBlock | undefined => {
    return blocks.find((block) => {
      const start = new Date(block.startDate);
      const end = new Date(block.endDate);
      // Set times to midnight for proper comparison
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      const checkDate = new Date(date);
      checkDate.setHours(12, 0, 0, 0);
      return checkDate >= start && checkDate <= end;
    });
  };

  // Get dates that are unavailable
  const unavailableDates = blocks
    .filter(b => !b.isAvailable)
    .flatMap(block => {
      const dates: Date[] = [];
      const start = new Date(block.startDate);
      const end = new Date(block.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
      return dates;
    });

  // Get dates that are available
  const availableDates = blocks
    .filter(b => b.isAvailable)
    .flatMap(block => {
      const dates: Date[] = [];
      const start = new Date(block.startDate);
      const end = new Date(block.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
      return dates;
    });

  const modifiers = {
    unavailable: unavailableDates,
    available: availableDates,
  };

  const modifiersClassNames = {
    unavailable: "bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-300 font-semibold",
    available: "bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-300 font-semibold",
  };

  const handleAddBlock = async () => {
    if (!selectedRange?.from || !selectedRange?.to) {
      toast.error("Please select a date range");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/equipment/${equipmentId}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: selectedRange.from.toISOString(),
          endDate: selectedRange.to.toISOString(),
          isAvailable: blockType === "available",
          reason: reason || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add block");
      }

      setBlocks((prev) => [...prev, data.block]);
      toast.success("Availability updated");
      setShowAddDialog(false);
      setSelectedRange(undefined);
      setReason("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add block");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    try {
      const res = await fetch(`/api/equipment/${equipmentId}/availability`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId }),
      });

      if (!res.ok) {
        throw new Error("Failed to delete block");
      }

      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      toast.success("Block removed");
      router.refresh();
    } catch (error) {
      toast.error("Failed to remove block");
    }
  };

  const handleQuickAction = async (action: "available" | "unavailable" | "clear") => {
    if (action === "clear") {
      // Delete all blocks
      for (const block of blocks) {
        await handleDeleteBlock(block.id);
      }
      toast.success("All availability blocks cleared");
      return;
    }

    // Mark current month as available or unavailable
    const start = startOfMonth(month);
    const end = endOfMonth(month);

    setIsSaving(true);
    try {
      const res = await fetch(`/api/equipment/${equipmentId}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          isAvailable: action === "available",
          reason: action === "available" ? "Marked available" : "Marked unavailable",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update");
      }

      setBlocks((prev) => [...prev, data.block]);
      toast.success(`Month marked as ${action}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    } finally {
      setIsSaving(false);
    }
  };

  const handleHideListing = async () => {
    if (!onStatusChange) {
      // Direct API call if no callback provided
      try {
        const res = await fetch(`/api/equipment/${equipmentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "PAUSED" }),
        });

        if (!res.ok) {
          throw new Error("Failed to hide listing");
        }

        toast.success("Listing hidden");
        router.refresh();
      } catch (error) {
        toast.error("Failed to hide listing");
      }
    } else {
      onStatusChange("PAUSED");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Availability Calendar
            </CardTitle>
            <CardDescription>
              Mark dates when your equipment is available or unavailable
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowAddDialog(true)}
              disabled={!selectedRange?.from}
              size="sm"
            >
              <Plus className="w-4 h-4 me-2" />
              Add Block
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MoreHorizontal className="w-4 h-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleQuickAction("available")}>
                  <CheckCircle className="w-4 h-4 me-2 text-green-600" />
                  Mark Month Available
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickAction("unavailable")}>
                  <XCircle className="w-4 h-4 me-2 text-red-600" />
                  Mark Month Unavailable
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickAction("clear")}>
                  <CalendarIcon className="w-4 h-4 me-2" />
                  Clear All Blocks
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleHideListing}>
                  <EyeOff className="w-4 h-4 me-2" />
                  Hide Listing
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/30 border border-red-300" />
            <span>Unavailable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30 border border-green-300" />
            <span>Available</span>
          </div>
          <div className="text-muted-foreground">
            Click and drag to select date range
          </div>
        </div>

        {/* Calendar */}
        <div className="flex justify-center overflow-x-auto">
          <Calendar
            mode="range"
            selected={selectedRange}
            onSelect={(range) => setSelectedRange(range as { from: Date; to?: Date } | undefined)}
            numberOfMonths={2}
            month={month}
            onMonthChange={setMonth}
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            className="rounded-md border"
          />
        </div>

        {/* Selected Range Info */}
        {selectedRange?.from && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="text-sm">
              <span className="font-medium">Selected: </span>
              {format(selectedRange.from, "MMM d, yyyy")}
              {selectedRange.to && ` - ${format(selectedRange.to, "MMM d, yyyy")}`}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedRange(undefined)}
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={() => setShowAddDialog(true)}
                disabled={!selectedRange.to}
              >
                Add Block
              </Button>
            </div>
          </div>
        )}

        {/* Existing Blocks */}
        {blocks.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Scheduled Blocks</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {blocks.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={block.isAvailable ? "default" : "destructive"}
                      className={block.isAvailable ? "bg-green-600" : ""}
                    >
                      {block.isAvailable ? "Available" : "Unavailable"}
                    </Badge>
                    <span className="text-sm">
                      {format(new Date(block.startDate), "MMM d, yyyy")} -{" "}
                      {format(new Date(block.endDate), "MMM d, yyyy")}
                    </span>
                    {block.reason && (
                      <span className="text-sm text-muted-foreground">
                        ({block.reason})
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteBlock(block.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Add Block Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Availability Block</DialogTitle>
            <DialogDescription>
              {selectedRange?.from && selectedRange?.to ? (
                <>
                  {format(selectedRange.from, "MMM d, yyyy")} -{" "}
                  {format(selectedRange.to, "MMM d, yyyy")}
                </>
              ) : (
                "Select a date range on the calendar first"
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Block Type</Label>
              <RadioGroup
                value={blockType}
                onValueChange={(v) => setBlockType(v as "available" | "unavailable")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="unavailable" id="unavailable" />
                  <Label htmlFor="unavailable" className="font-normal cursor-pointer">
                    <span className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      Mark as Unavailable (rented, maintenance)
                    </span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="available" id="available" />
                  <Label htmlFor="available" className="font-normal cursor-pointer">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Mark as Available (highlight open dates)
                    </span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                placeholder="e.g., Maintenance, Rented externally, Holiday"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddBlock} disabled={isSaving || !selectedRange?.from || !selectedRange?.to}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Block"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
