import type { ReactNode } from "react";

/** Inline alerts in the spirit of [Tailwind Plus Alerts](https://tailwindcss.com/plus/ui-blocks/application-ui/feedback/alerts): accent border, icon, title, optional description and list. */
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
      ? "border-red-200/80 bg-red-50/90 dark:border-red-500/30 dark:bg-red-950/35"
      : "border-amber-200/80 bg-amber-50/90 dark:border-amber-500/30 dark:bg-amber-950/30";

  const accent =
    variant === "error"
      ? "border-l-red-600 dark:border-l-red-400"
      : "border-l-amber-600 dark:border-l-amber-400";

  const iconColor =
    variant === "error"
      ? "text-red-600 dark:text-red-400"
      : "text-amber-600 dark:text-amber-400";

  const iconBg =
    variant === "error"
      ? "bg-red-500/15 dark:bg-red-500/20"
      : "bg-amber-500/15 dark:bg-amber-500/20";

  const titleCls =
    variant === "error"
      ? "text-red-900 dark:text-red-100"
      : "text-amber-950 dark:text-amber-100";

  const bodyCls =
    variant === "error"
      ? "text-red-800/95 dark:text-red-200/90"
      : "text-amber-900/95 dark:text-amber-100/90";

  const listMarker =
    variant === "error"
      ? "marker:text-red-600 dark:marker:text-red-400"
      : "marker:text-amber-700 dark:marker:text-amber-400";

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`rounded-md border border-l-4 p-4 ${shell} ${accent} ${className}`.trim()}
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
