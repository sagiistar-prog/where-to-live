import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { PreferencePreset } from "@/lib/preference-presets";

export function PreferencePresetButtons({
  presets,
  onApply,
}: {
  presets: PreferencePreset[];
  onApply: (preset: PreferencePreset) => void;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-3">
      {presets.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => onApply(preset)}
          className="rounded-md border border-border bg-secondary/70 p-3 text-left transition hover:border-primary/35 hover:bg-primary/10"
        >
          <span className="block text-sm font-medium text-foreground">{preset.label}</span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            {preset.description}
          </span>
        </button>
      ))}
    </div>
  );
}

export function ControlledPreferenceField({
  label,
  value,
  onChange,
  placeholder,
  helper,
  inputMode,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helper?: string;
  inputMode?: "decimal" | "numeric" | "text";
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required ? <span className="ml-1 text-primary">*</span> : null}
      </Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        required={required}
      />
      {helper ? <p className="text-xs leading-5 text-muted-foreground">{helper}</p> : null}
    </div>
  );
}
