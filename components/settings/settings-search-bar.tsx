"use client";

import { useEffect, useRef, useState, type SVGProps } from "react";
import { cn } from "@/lib/cn";

function IconSearch(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden {...props}>
      <path
        d="m17.5 17.5-4.5-4.5m1.5-4a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconClose(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden {...props}>
      <path
        d="m5 5 10 10M15 5 5 15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function SettingsSearchBar({
  value,
  onChange,
  placeholder = "Search settings (e.g. appearance, tokens, workspaces)…",
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMac] = useState(() => {
    if (typeof navigator === "undefined") return false;
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform || "");
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus on Cmd+K or Ctrl+K or / (when not already typing in another input/textarea)
      if (
        (e.key === "k" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "/" &&
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA")
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Clear and blur on Escape when focused
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        if (value) {
          onChange("");
        } else {
          inputRef.current?.blur();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [value, onChange]);

  return (
    <div className={cn("relative w-full", className)}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
        <IconSearch className="size-4" />
      </div>

      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search settings"
        className="w-full min-w-0 rounded-[var(--radius-md)] border border-border bg-background py-2.5 pr-20 pl-10 text-sm text-foreground antialiased placeholder:text-muted/70 transition-[border-color,box-shadow] duration-200 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 [&::-webkit-search-cancel-button]:hidden"
      />

      <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 gap-1.5">
        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-muted-surface hover:text-foreground"
          >
            <IconClose className="size-3.5" />
          </button>
        ) : (
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-[var(--radius-sm)] border border-border/80 bg-muted-surface px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted">
            <span>{isMac ? "⌘" : "Ctrl"}</span>
            <span>K</span>
          </kbd>
        )}
      </div>
    </div>
  );
}
