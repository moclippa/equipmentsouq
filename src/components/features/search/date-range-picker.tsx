"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarDays, X } from "lucide-react";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Select dates",
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  const handleSelect = (range: DateRange | undefined) => {
    onChange(range);
    // Close popover when both dates are selected
    if (range?.from && range?.to) {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-start font-normal",
            !value?.from && "text-muted-foreground",
            className
          )}
        >
          <CalendarDays className="w-4 h-4 me-2 text-muted-foreground" />
          {value?.from ? (
            <span className="flex-1 truncate">
              {format(value.from, "MMM d")}
              {value.to && ` - ${format(value.to, "MMM d")}`}
            </span>
          ) : (
            <span className="flex-1">{placeholder}</span>
          )}
          {value?.from && (
            <X
              className="w-4 h-4 ms-2 text-muted-foreground hover:text-foreground"
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={value}
          onSelect={handleSelect}
          numberOfMonths={2}
          disabled={{ before: new Date() }}
        />
        <div className="p-3 border-t flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(undefined)}
          >
            Clear
          </Button>
          <Button size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
