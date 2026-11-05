"use client";

import type { ReactNode } from "react";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" | "green" }) {
  const styles = {
    primary: "bg-teal text-white hover:bg-teal-dark",
    green: "bg-green text-[#063b2a] hover:bg-green-dark hover:text-white",
    secondary: "bg-white text-teal ring-1 ring-teal/25 hover:bg-teal-50",
    danger: "bg-white text-[#c4441c] ring-1 ring-coral/50 hover:bg-coral/10",
    ghost: "text-teal hover:bg-teal-50",
  }[variant];
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-[#1f4547]">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-[11px] text-[#5b7a7c]">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-teal/20 bg-white px-3 py-2 text-sm text-[#0f2f31] outline-none transition placeholder:text-[#8aa6a7] focus:border-teal focus:ring-2 focus:ring-teal/15";

export function StatusBadge({ status }: { status: "pending" | "published" }) {
  return status === "published" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#047a46]">
      <span className="h-1.5 w-1.5 rounded-full bg-green" /> Published
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-sun/30 px-2.5 py-0.5 text-[11px] font-semibold text-[#8a5a00]">
      <span className="h-1.5 w-1.5 rounded-full bg-sun" /> Pending review
    </span>
  );
}

export function Notice({ kind, children, onClose }: { kind: "success" | "error" | "info"; children: ReactNode; onClose?: () => void }) {
  const style = {
    success: "bg-green/12 text-[#035c34] ring-green/40",
    error: "bg-coral/10 text-[#a33a16] ring-coral/40",
    info: "bg-teal-50 text-teal ring-teal/20",
  }[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-sm ring-1 ${style}`}>
      <div className="flex-1">{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} className="text-lg leading-none opacity-60 hover:opacity-100" aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}
