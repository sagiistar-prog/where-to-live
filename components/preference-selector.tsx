"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { livingPreferences } from "@/lib/living-preferences";
import { cn } from "@/lib/utils";

type PreferenceSelectorProps = {
  value?: string[];
  onChange?: (value: string[]) => void;
};

export function PreferenceSelector({ value, onChange }: PreferenceSelectorProps) {
  const [internalSelected, setInternalSelected] = useState<string[]>([
    "独居",
    "必须近地铁",
    "怕潮湿",
  ]);
  const selected = value ?? internalSelected;

  function togglePreference(value: string) {
    const next = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];

    if (onChange) {
      onChange(next);
    } else {
      setInternalSelected(next);
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {livingPreferences.map((preference) => {
        const checked = selected.includes(preference);
        return (
          <Label
            key={preference}
            className={cn(
              "flex min-w-0 cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm transition-all hover:border-primary/35 hover:bg-primary/10",
              checked
                ? "border-primary/35 bg-primary/10 text-foreground"
                : "border-border bg-secondary/70 text-muted-foreground",
            )}
          >
            <Checkbox
              checked={checked}
              onCheckedChange={() => togglePreference(preference)}
              aria-label={preference}
            />
            {preference}
          </Label>
        );
      })}
    </div>
  );
}
