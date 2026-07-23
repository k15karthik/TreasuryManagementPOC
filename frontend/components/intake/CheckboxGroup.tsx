"use client";

import { cn } from "@/lib/utils";

interface CheckboxGroupProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  columns?: 1 | 2;
}

export function CheckboxGroup({ options, value, onChange, columns = 2 }: CheckboxGroupProps) {
  function toggle(option: string) {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  }

  return (
    <div className={cn("grid gap-2", columns === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
      {options.map((option) => {
        const checked = value.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className={cn(
              "flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
              checked
                ? "border-primary bg-accent text-accent-foreground"
                : "border-input bg-background text-foreground hover:bg-secondary/60"
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                checked ? "border-primary bg-primary text-primary-foreground" : "border-input"
              )}
            >
              {checked && (
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3}>
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            {option}
          </button>
        );
      })}
    </div>
  );
}
