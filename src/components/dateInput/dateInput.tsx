"use client";
import React, { useRef } from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & { className?: string };

export default function DateInput({ className = "", onFocus, onClick, ...rest }: Props) {
  const ref = useRef<HTMLInputElement | null>(null);

  const openPickerIfPossible = () => {
    const el = ref.current;
    if (!el) return;
    if (typeof (el as any).showPicker === "function") {
      try { (el as any).showPicker(); } catch { /* ignore */ }
    }
  };

  return (
    <div className={className}>
      <input
        {...rest}
        ref={ref}
        type="date"
        onFocus={(e) => {
          openPickerIfPossible();
          onFocus && onFocus(e);
        }}
        onClick={(e) => {
          openPickerIfPossible();
          onClick && onClick(e);
        }}
        className={`w-full bg-transparent ${className}`}
      />
    </div>
  );
}
