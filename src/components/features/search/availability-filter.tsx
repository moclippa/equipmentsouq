"use client";

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DateRangePicker } from "./date-range-picker";
import { DateRange } from "react-day-picker";

interface AvailabilityFilterProps {
  showUnavailable: boolean;
  onShowUnavailableChange: (value: boolean) => void;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

export function AvailabilityFilter({
  showUnavailable,
  onShowUnavailableChange,
  dateRange,
  onDateRangeChange,
}: AvailabilityFilterProps) {
  return (
    <div className="space-y-4">
      {/* Show/Hide Unavailable Toggle */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="show-unavailable"
          checked={showUnavailable}
          onCheckedChange={(checked) =>
            onShowUnavailableChange(checked === true)
          }
        />
        <Label
          htmlFor="show-unavailable"
          className="text-sm font-medium cursor-pointer"
        >
          Show rented/sold items
        </Label>
      </div>

      {/* Date Range Picker - for rental availability check */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          Check availability for dates
        </Label>
        <DateRangePicker
          value={dateRange}
          onChange={onDateRangeChange}
          placeholder="Select rental dates"
        />
        {dateRange?.from && (
          <p className="text-xs text-muted-foreground mt-1.5">
            Items with conflicting bookings will show a warning badge
          </p>
        )}
      </div>
    </div>
  );
}
