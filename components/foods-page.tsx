"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ShellMainPage } from "@/components/shell-main-page";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SHELL_FULL_SPAN } from "@/lib/shell-layout";
import { FOOD_TYPE_LABEL, FOOD_TYPE_MARK } from "@/lib/foods-type-icons";
import {
  FOOD_TYPES,
  distinctFoodTypesForDay,
  type FoodType,
  type MealSlot,
} from "@/lib/validators/foods";
import { cn } from "@/lib/cn";

type Entry = {
  id: string;
  loggedOn: string;
  foodType: FoodType;
  mealSlot: MealSlot | null;
  note: string | null;
};

type Analysis = {
  summary: string;
  suggestions: string[];
  status: "ok" | "error";
  errorMessage: string | null;
} | null;

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthBounds(year: number, monthIndex: number) {
  const from = ymd(new Date(year, monthIndex, 1));
  const to = ymd(new Date(year, monthIndex + 1, 0));
  return { from, to };
}

function daysInMonthGrid(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  const startPad = first.getDay(); // Sun=0
  const lastDate = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<{ date: string | null; dayNum: number | null }> = [];
  for (let i = 0; i < startPad; i++) {
    cells.push({ date: null, dayNum: null });
  }
  for (let d = 1; d <= lastDate; d++) {
    cells.push({ date: ymd(new Date(year, monthIndex, d)), dayNum: d });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, dayNum: null });
  }
  return cells;
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function FoodsPage() {
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(ymd(now));
  const [entries, setEntries] = useState<Entry[]>([]);
  const [analysis, setAnalysis] = useState<Analysis>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foodType, setFoodType] = useState<FoodType>("vegetable");
  const [mealSlot, setMealSlot] = useState<"" | MealSlot>("");
  const [note, setNote] = useState("");

  const loadMonth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = monthBounds(year, monthIndex);
      const [list, analysisRes] = await Promise.all([
        apiJson<{ entries: Entry[] }>(
          `/api/foods/entries?from=${from}&to=${to}`,
        ),
        apiJson<{ analysis: Analysis }>("/api/foods/analysis"),
      ]);
      setEntries(list.entries);
      setAnalysis(analysisRes.analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [year, monthIndex]);

  useEffect(() => {
    void loadMonth();
  }, [loadMonth]);

  const byDay = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of entries) {
      const list = map.get(e.loggedOn) ?? [];
      list.push(e);
      map.set(e.loggedOn, list);
    }
    return map;
  }, [entries]);

  const dayEntries = byDay.get(selectedDay) ?? [];
  const cells = daysInMonthGrid(year, monthIndex);
  const monthLabel = new Date(year, monthIndex, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAnalyzing(true);
    setError(null);
    try {
      const result = await apiJson<{ entry: Entry; analysis: Analysis }>(
        "/api/foods/entries",
        {
          method: "POST",
          body: JSON.stringify({
            loggedOn: selectedDay,
            foodType,
            mealSlot: mealSlot || null,
            note: note.trim() || null,
          }),
        },
      );
      setEntries((prev) => [...prev, result.entry]);
      setAnalysis(result.analysis);
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
      setAnalyzing(false);
    }
  }

  async function onDelete(id: string) {
    setAnalyzing(true);
    setError(null);
    try {
      const result = await apiJson<{ analysis: Analysis }>(
        `/api/foods/entries/${id}`,
        { method: "DELETE" },
      );
      setEntries((prev) => prev.filter((x) => x.id !== id));
      setAnalysis(result.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function onRetryAnalysis() {
    setAnalyzing(true);
    setError(null);
    try {
      const result = await apiJson<{ analysis: Analysis }>(
        "/api/foods/analysis/retry",
        { method: "POST" },
      );
      setAnalysis(result.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setAnalyzing(false);
    }
  }

  function shiftMonth(delta: number) {
    const d = new Date(year, monthIndex + delta, 1);
    setYear(d.getFullYear());
    setMonthIndex(d.getMonth());
  }

  return (
    <ShellMainPage
      title="Foods"
      meta="Log food types · calendar · AI balance tips"
      description="Track what you ate by type. Analysis suggests variety for the next day. Not medical advice."
    >
      <div className={cn(SHELL_FULL_SPAN, "flex flex-col gap-6 fx-fade-in")}>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <section
          className="rounded-[var(--radius-md)] border border-border bg-surface p-4 shadow-[var(--shadow-sm)]"
          aria-label="Calendar"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              iconOnly
              aria-label="Previous month"
              onClick={() => shiftMonth(-1)}
            >
              ‹
            </Button>
            <h2 className="font-display text-lg">{monthLabel}</h2>
            <Button
              type="button"
              variant="ghost"
              iconOnly
              aria-label="Next month"
              onClick={() => shiftMonth(1)}
            >
              ›
            </Button>
          </div>
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            }}
          >
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div
                key={d}
                className="text-center text-xs text-muted py-1"
              >
                {d}
              </div>
            ))}
            {cells.map((cell, i) => {
              if (!cell.date) {
                return <div key={`pad-${i}`} className="min-h-14" />;
              }
              const dayList = byDay.get(cell.date) ?? [];
              const types = distinctFoodTypesForDay(dayList);
              const selected = cell.date === selectedDay;
              return (
                <button
                  key={cell.date}
                  type="button"
                  className={cn(
                    "min-h-14 fx-hit-40 fx-press rounded-[var(--radius-sm)] border border-transparent p-1 text-left transition-colors",
                    selected
                      ? "border-accent bg-accent/10"
                      : "hover:bg-muted/40",
                  )}
                  aria-label={`${cell.date}, ${types.length} types`}
                  aria-pressed={selected}
                  onClick={() => setSelectedDay(cell.date!)}
                >
                  <span className="text-xs tabular-nums">{cell.dayNum}</span>
                  <div className="mt-0.5 flex flex-wrap gap-0.5">
                    {types.slice(0, 4).map((t) => (
                      <span
                        key={t}
                        title={FOOD_TYPE_LABEL[t]}
                        className="inline-flex size-4 items-center justify-center rounded-[var(--radius-sm)] bg-muted text-[9px] font-medium"
                      >
                        {FOOD_TYPE_MARK[t]}
                      </span>
                    ))}
                    {types.length > 4 ? (
                      <span className="text-[9px] text-muted">
                        +{types.length - 4}
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
          {loading ? (
            <p className="mt-2 text-sm text-muted">Loading…</p>
          ) : null}
        </section>

        <div
          className="grid gap-6"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 20rem), 1fr))",
          }}
        >
          <section
            className="rounded-[var(--radius-md)] border border-border bg-surface p-4 shadow-[var(--shadow-sm)]"
            aria-label="Day log"
          >
            <h2 className="font-display text-base mb-3">
              Log for {selectedDay}
            </h2>
            <ul className="mb-4 flex flex-col gap-2">
              {dayEntries.length === 0 ? (
                <li className="text-sm text-muted">
                  No entries yet. Add a food type below.
                </li>
              ) : (
                dayEntries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-start justify-between gap-2 rounded-[var(--radius-sm)] border border-border px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {FOOD_TYPE_LABEL[entry.foodType]}
                        {entry.mealSlot ? (
                          <span className="text-muted font-normal">
                            {" "}
                            · {entry.mealSlot}
                          </span>
                        ) : null}
                      </p>
                      {entry.note ? (
                        <p className="text-xs text-muted">
                          {entry.note}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void onDelete(entry.id)}
                    >
                      Remove
                    </Button>
                  </li>
                ))
              )}
            </ul>

            <form className="flex flex-col gap-3" onSubmit={onSave}>
              <Field label="Food type">
                <div className="flex flex-wrap gap-1.5">
                  {FOOD_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={cn(
                        "fx-press rounded-[var(--radius-sm)] border px-2 py-1 text-xs transition-colors",
                        foodType === t
                          ? "border-accent bg-accent/15"
                          : "border-border",
                      )}
                      aria-pressed={foodType === t}
                      onClick={() => setFoodType(t)}
                    >
                      {FOOD_TYPE_MARK[t]} {FOOD_TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Meal (optional)">
                <Select
                  value={mealSlot}
                  onChange={(ev) =>
                    setMealSlot(ev.target.value as "" | MealSlot)
                  }
                >
                  <option value="">None</option>
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                </Select>
              </Field>
              <Field label="Note (optional)">
                <Textarea
                  value={note}
                  onChange={(ev) => setNote(ev.target.value)}
                  maxLength={280}
                  rows={2}
                  placeholder="Short note"
                />
              </Field>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Add entry"}
              </Button>
            </form>
          </section>

          <section
            className="rounded-[var(--radius-md)] border border-border bg-surface p-4 shadow-[var(--shadow-sm)]"
            aria-label="AI analysis"
            aria-busy={analyzing}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="font-display text-base">AI tips</h2>
              {analysis?.status === "error" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void onRetryAnalysis()}
                  disabled={analyzing}
                >
                  Retry
                </Button>
              ) : null}
            </div>
            {analyzing ? (
              <p className="text-sm text-muted">Analyzing…</p>
            ) : null}
            {!analysis && !analyzing ? (
              <p className="text-sm text-muted">
                Save a log to get variety and next-day suggestions.
              </p>
            ) : null}
            {analysis ? (
              <div className="flex flex-col gap-3">
                {analysis.status === "error" && analysis.errorMessage ? (
                  <p className="text-sm text-destructive" role="status">
                    Analysis issue: {analysis.errorMessage}
                  </p>
                ) : null}
                {analysis.summary ? (
                  <p className="text-sm">{analysis.summary}</p>
                ) : null}
                {analysis.suggestions.length > 0 ? (
                  <ul className="list-disc pl-5 text-sm flex flex-col gap-1">
                    {analysis.suggestions.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            <p className="mt-4 text-xs text-muted">
              Not medical advice. Suggestions are for food-type variety only.
            </p>
          </section>
        </div>
      </div>
    </ShellMainPage>
  );
}
