"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Variant = "success" | "error" | "warning";

export type NotifyFns = {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
};

const NotificationContext = createContext<NotifyFns | null>(null);

export function useNotify(): NotifyFns {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotify must be used within NotificationProvider");
  }
  return ctx;
}

type Toast = {
  id: string;
  title: string;
  description?: string;
  variant: Variant;
};

function ToastRow({
  title,
  description,
  variant,
  onDismiss,
}: Omit<Toast, "id"> & { onDismiss: () => void }) {
  useEffect(() => {
    const ms =
      variant === "error" ? 8000 : variant === "warning" ? 7000 : 5000;
    const t = window.setTimeout(onDismiss, ms);
    return () => window.clearTimeout(t);
  }, [variant, onDismiss]);

  const a11yRole = variant === "error" ? "alert" : "status";

  return (
    <div
      className={`pointer-events-auto w-full max-w-sm rounded-md border border-l-4 p-4 shadow-lg ring-1 ring-black/5 dark:ring-white/10 ${
        variant === "success"
          ? "border-border border-l-emerald-600 bg-surface dark:border-l-emerald-500"
          : variant === "warning"
            ? "border-amber-200/80 bg-amber-50/95 dark:border-amber-500/35 dark:bg-amber-950/40 border-l-amber-600 dark:border-l-amber-400"
            : "border-red-200/80 bg-red-50/95 dark:border-red-500/35 dark:bg-red-950/40 border-l-red-600 dark:border-l-red-400"
      }`}
      role={a11yRole}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          {variant === "success" ? (
            <span className="flex size-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <svg className="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          ) : variant === "warning" ? (
            <span className="flex size-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <svg className="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          ) : (
            <span className="flex size-10 items-center justify-center rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
              <svg className="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
          <p
            className={`text-sm font-semibold break-words ${
              variant === "success"
                ? "text-foreground"
                : variant === "warning"
                  ? "text-amber-950 dark:text-amber-50"
                  : "text-red-950 dark:text-red-50"
            }`}
          >
            {title}
          </p>
          {description ? (
            <p
              className={`text-sm break-words ${
                variant === "success"
                  ? "text-muted"
                  : variant === "warning"
                    ? "text-amber-900/95 dark:text-amber-100/90"
                    : "text-red-900/95 dark:text-red-100/90"
              }`}
            >
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-shrink-0">
          <button
            type="button"
            onClick={onDismiss}
            className="-m-1 inline-flex rounded-lg p-1 text-muted hover:bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            <span className="sr-only">Dismiss</span>
            <svg className="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((toast: Omit<Toast, "id">) => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-4), { ...toast, id }]);
  }, []);

  const value = useMemo<NotifyFns>(
    () => ({
      success: (title, description) => push({ title, description, variant: "success" }),
      error: (title, description) => push({ title, description, variant: "error" }),
      warning: (title, description) => push({ title, description, variant: "warning" }),
    }),
    [push],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-end gap-3 p-4 sm:p-6"
      >
        {toasts.map((t) => (
          <ToastRow
            key={t.id}
            title={t.title}
            description={t.description}
            variant={t.variant}
            onDismiss={() => dismiss(t.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
