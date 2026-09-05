"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useNotify } from "@/components/notification-provider";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import type { CitySearchResult } from "@/lib/weather/open-meteo";

const SEARCH_DEBOUNCE_MS = 280;
const MIN_QUERY_LENGTH = 2;

export function WeatherCitySettings({
  embedded,
  initialCity,
}: {
  embedded?: boolean;
  initialCity: string | null;
}) {
  const notify = useNotify();
  const listId = useId();
  const [city, setCity] = useState(initialCity ?? "");
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<CitySearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [inputFocused, setInputFocused] = useState(false);
  const blurTimerRef = useRef<number | null>(null);
  const requestSeqRef = useRef(0);

  const showSuggestions =
    inputFocused &&
    suggestOpen &&
    city.trim().length >= MIN_QUERY_LENGTH &&
    (searching || suggestions.length > 0);

  const save = useCallback(async (nextCity: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weatherCity: nextCity.trim() ? nextCity.trim() : null,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        data?: { weatherCity: string | null };
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Could not save city");
      }
      setCity(json.data?.weatherCity ?? "");
      setSuggestions([]);
      setSuggestOpen(false);
      setHighlight(-1);
      notify.success(
        "Kiosk weather updated",
        json.data?.weatherCity ? json.data.weatherCity : "City cleared",
      );
    } catch (e) {
      notify.error(
        "Could not save city",
        e instanceof Error ? e.message : "Try again.",
      );
    } finally {
      setSaving(false);
    }
  }, [notify]);

  const pickSuggestion = useCallback(
    (item: CitySearchResult) => {
      setCity(item.name);
      setSuggestions([]);
      setSuggestOpen(false);
      setHighlight(-1);
      void save(item.name);
    },
    [save],
  );

  useEffect(() => {
    const query = city.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      setSuggestions((prev) => (prev.length === 0 ? prev : []));
      setSearching((prev) => (prev ? false : prev));
      setHighlight((prev) => (prev === -1 ? prev : -1));
      return;
    }

    const seq = ++requestSeqRef.current;
    setSearching(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/user/preferences/city-search?q=${encodeURIComponent(query)}`,
          );
          if (!res.ok || seq !== requestSeqRef.current) return;
          const json = (await res.json()) as { data?: CitySearchResult[] };
          if (seq !== requestSeqRef.current) return;
          setSuggestions(json.data ?? []);
          setHighlight(json.data?.length ? 0 : -1);
        } catch {
          if (seq === requestSeqRef.current) setSuggestions([]);
        } finally {
          if (seq === requestSeqRef.current) setSearching(false);
        }
      })();
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [city]);

  function handleInputFocus() {
    if (blurTimerRef.current != null) {
      window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    setInputFocused(true);
    setSuggestOpen(true);
  }

  function handleInputBlur() {
    blurTimerRef.current = window.setTimeout(() => {
      setInputFocused(false);
      setSuggestOpen(false);
      setHighlight(-1);
    }, 120);
  }

  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        void save(city);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((prev) => (prev + 1) % suggestions.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((prev) =>
        prev <= 0 ? suggestions.length - 1 : prev - 1,
      );
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const picked =
        highlight >= 0 ? suggestions[highlight] : suggestions[0];
      if (picked) pickSuggestion(picked);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setSuggestOpen(false);
      setHighlight(-1);
    }
  }

  const inner = (
    <>
      {!embedded ? (
        <h2 className="font-display text-lg font-medium tracking-tight">Kiosk</h2>
      ) : null}
      <p className="text-sm text-muted">
        City name for weather on your kiosk dashboard. Start typing for
        suggestions — powered by Open-Meteo, no API key required.
      </p>
      <Field label="Weather city">
        <div className="relative min-w-0">
          <Input
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setSuggestOpen(true);
            }}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            placeholder="e.g. Ho Chi Minh City"
            autoComplete="off"
            disabled={saving}
            role="combobox"
            aria-expanded={showSuggestions}
            aria-controls={showSuggestions ? listId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={
              showSuggestions && highlight >= 0
                ? `${listId}-opt-${highlight}`
                : undefined
            }
          />
          {showSuggestions ? (
            <ul
              id={listId}
              role="listbox"
              aria-label="City suggestions"
              className="absolute start-0 top-[calc(100%+0.25rem)] z-50 max-h-48 w-full min-w-0 overflow-auto rounded-[var(--radius-md)] border border-border bg-surface p-1 shadow-[var(--shadow-md)]"
            >
              {searching && suggestions.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted">Searching…</li>
              ) : null}
              {suggestions.map((item, index) => {
                const selected = index === highlight;
                return (
                  <li key={item.id} role="presentation">
                    <button
                      id={`${listId}-opt-${index}`}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickSuggestion(item)}
                      className={cn(
                        "flex w-full flex-col gap-0.5 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm transition-[background-color,color] duration-150",
                        selected
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground hover:bg-muted-surface",
                      )}
                    >
                      <span className="font-medium">{item.name}</span>
                      <span
                        className={cn(
                          "text-sm",
                          selected ? "text-accent-foreground/80" : "text-muted",
                        )}
                      >
                        {item.label}
                      </span>
                    </button>
                  </li>
                );
              })}
              {!searching && suggestions.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted">No cities found</li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="primary"
          disabled={saving}
          onClick={() => save(city)}
        >
          Save city
        </Button>
        {city.trim() ? (
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => save("")}
          >
            Clear
          </Button>
        ) : null}
      </div>
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{inner}</div>;
  }

  return (
    <div className="space-y-4 rounded-[var(--radius-md)] border border-border bg-surface p-6">
      {inner}
    </div>
  );
}
