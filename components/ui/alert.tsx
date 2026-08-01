import type { ReactNode } from "react";

/** Inline alerts using semantic theme tokens (Facebook light / Catppuccin Mocha dark). */
export function Alert({
  variant,
  title,
  description,
  list,
  className = "",
}: {
  variant: "error" | "warning";
  title: string;
  description?: ReactNode;
  list?: readonly string[];
  className?: string;
}) {
  const hasList = list != null && list.length > 0;
  const hasDescription = description != null && description !== "";
  const hasBody = hasDescription || hasList;

  const shell =
    variant === "error"
      ? "border-[var(--alert-error-border)] bg-[var(--alert-error-bg)] border-l-[var(--alert-error-accent)]"
      : "border-[var(--alert-warning-border)] bg-[var(--alert-warning-bg)] border-l-[var(--alert-warning-accent)]";

  const iconColor =
    variant === "error"
      ? "text-[var(--alert-error-accent)]"
      : "text-[var(--alert-warning-accent)]";

  const iconBg =
    variant === "error"
      ? "bg-[var(--destructive-icon-bg)]"
      : "bg-[color-mix(in_oklab,var(--alert-warning-accent)_18%,transparent)]";

  const titleCls =
    variant === "error"
      ? "text-[var(--alert-error-title)]"
      : "text-[var(--alert-warning-title)]";

  const bodyCls =
    variant === "error"
      ? "text-[var(--alert-error-body)]"
      : "text-[var(--alert-warning-body)]";

  const listMarker =
    variant === "error"
      ? "marker:text-[var(--alert-error-accent)]"
      : "marker:text-[var(--alert-warning-accent)]";

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`rounded-[var(--radius-md)] border border-l-4 p-4 fx-fade-in ${shell} ${className}`.trim()}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <span
            className={`flex size-10 items-center justify-center rounded-full ${iconBg} ${iconColor}`}
          >
            {variant === "error" ? <ErrorIcon /> : <WarningIcon />}
          </span>
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p
            className={`text-sm ${hasBody ? "font-semibold" : "font-medium"} ${titleCls}`}
          >
            {title}
          </p>
          {hasDescription ? (
            <div className={`mt-1 text-sm ${bodyCls}`}>{description}</div>
          ) : null}
          {hasList ? (
            <ul
              className={`mt-2 list-inside list-disc space-y-1 text-sm ${bodyCls} ${listMarker}`}
            >
              {list.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ErrorIcon() {
  return (
    <svg className="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}
