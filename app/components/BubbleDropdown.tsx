"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type BubbleDropdownProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  required?: boolean;
  name?: string;
};

const triggerClass =
  "ui-input flex h-14 w-full min-w-0 items-center justify-between gap-3 px-5 py-3 text-left text-base outline-none sm:text-sm";

const chevronWrapClass =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm";

export function BubbleDropdown({
  id,
  value,
  onChange,
  options,
  placeholder = "Select an option",
  required = false,
  name,
}: BubbleDropdownProps) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const displayLabel = value || placeholder;
  const isPlaceholder = !value;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectOption = (option: string) => {
    onChange(option);
    setOpen(false);
  };

  const labelClass = `min-w-0 flex-1 truncate ${isPlaceholder ? "text-zinc-400" : "text-[#0F172A]"}`;

  const chevron = (
    <span className={chevronWrapClass}>
      <ChevronDown
        aria-hidden="true"
        className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        strokeWidth={2}
      />
    </span>
  );

  return (
    <div ref={rootRef} className={`relative min-w-0 ${open ? "z-30" : "z-0"}`}>
      {name ? (
        <input
          tabIndex={-1}
          aria-hidden="true"
          name={name}
          value={value}
          required={required}
          readOnly
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
      ) : null}

      {open ? (
        <div className="overflow-hidden rounded-[1.75rem] border border-[#0069A8] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.1)] ring-2 ring-[#66A5CC]/30">
          <button
            id={fieldId}
            type="button"
            aria-haspopup="listbox"
            aria-expanded
            aria-controls={`${fieldId}-listbox`}
            onClick={() => setOpen(false)}
            className={`${triggerClass} border-b border-zinc-200/80 bg-[#F8FAFC]`}
          >
            <span className={labelClass}>{displayLabel}</span>
            {chevron}
          </button>

          <ul
            id={`${fieldId}-listbox`}
            role="listbox"
            aria-labelledby={fieldId}
            className="max-h-56 overflow-y-auto overscroll-contain px-2 py-2"
          >
            {options.map((option) => {
              const selected = option === value;
              return (
                <li key={option} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => selectOption(option)}
                    className={`flex w-full items-center rounded-2xl px-4 py-3 text-left text-sm transition ${
                      selected
                        ? "bg-[#0069A8]/10 font-semibold text-[#0069A8]"
                        : "text-[#0F172A] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <span className="min-w-0 break-words">{option}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <button
          id={fieldId}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={false}
          aria-controls={`${fieldId}-listbox`}
          onClick={() => setOpen(true)}
          className={`${triggerClass} rounded-full border border-zinc-200 bg-[#F8FAFC] shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition hover:bg-white focus:border-[#0069A8] focus:bg-white focus:ring-2 focus:ring-[#66A5CC]/30`}
        >
          <span className={labelClass}>{displayLabel}</span>
          {chevron}
        </button>
      )}
    </div>
  );
}
