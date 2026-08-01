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
  const durationMs =
    variant === "error" ? 8000 : variant === "warning" ? 7000 : 5000;

  useEffect(() => {
    const t = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(t);
  }, [durationMs, onDismiss]);

  const a11yRole = variant === "error" ? "alert" : "status";

  const shell =
    variant === "success"
      ? "border-[var(--toast-success-border)] bg-[var(--toast-success-bg)] border-l-[var(--toast-success-accent)]"
      : variant === "warning"
        ? "border-[var(--toast-warning-border)] bg-[var(--toast-warning-bg)] border-l-[var(--toast-warning-accent)]"
        : "border-[var(--toast-error-border)] bg-[var(--toast-error-bg)] border-l-[var(--toast-error-accent)]";

  const iconWrap =
    variant === "success"
      ? "bg-[var(--toast-success-icon-bg)] text-[var(--toast-success-accent)]"
      : variant === "warning"
        ? `bg-[var(--toast-warning-icon-bg)] text-[var(--toast-warning-accent)]`
        : `bg-[var(--toast-error-icon-bg)] text-[var(--toast-error-accent)]`;

  const titleCls =
    variant === "success"
      ? "text-[var(--toast-success-title)]"
      : variant === "warning"
        ? "text-[var(--toast-warning-title)]"
        : "text-[var(--toast-error-title)]";

  const bodyCls =
    variant === "success"
      ? "text-[var(--toast-success-body)]"
      : variant === "warning"
        ? "text-[var(--toast-warning-body)]"
        : "text-[var(--toast-error-body)]";

  const progressColor =
    variant === "success"
      ? "var(--toast-success-accent)"
      : variant === "warning"
        ? "var(--toast-warning-accent)"
        : "var(--toast-error-accent)";

  return (
    <div
      className={`pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-[var(--radius-md)] border border-l-4 p-4 pb-3 shadow-[var(--shadow-md)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_6%,transparent)] fx-fade-in ${shell}`}
      style={{ ["--toast-ms" as string]: `${durationMs}ms` }}
      role={a11yRole}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          {variant === "success" ? (
            <span
              className={`flex size-10 items-center justify-center rounded-full ${iconWrap}`}
            >
              <svg className="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          ) : variant === "warning" ? (
            <span
              className={`flex size-10 items-center justify-center rounded-full ${iconWrap}`}
            >
              <svg className="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          ) : (
            <span
              className={`flex size-10 items-center justify-center rounded-full ${iconWrap}`}
            >
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
          <p className={`text-sm font-semibold break-words ${titleCls}`}>{title}</p>
          {description ? (
            <p className={`text-sm break-words ${bodyCls}`}>{description}</p>
          ) : null}
        </div>
        <div className="flex flex-shrink-0">
          <button
            type="button"
            onClick={onDismiss}
            className="-m-1 inline-flex rounded-[var(--radius-sm)] p-1 text-muted transition-colors duration-200 hover:bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] hover:text-foreground focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background fx-press fx-hit-40"
          >
            <span className="sr-only">Dismiss</span>
            <svg className="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      </div>
      <div
        className="toast-progress-bar absolute bottom-0 left-0 right-0"
        style={{ background: progressColor }}
        aria-hidden
      />
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
      {toasts.length > 0 ? (
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
      ) : null}
    </NotificationContext.Provider>
  );
}
