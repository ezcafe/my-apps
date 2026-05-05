"use client";

import { useCallback, useEffect, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { Alert } from "@/components/ui/alert";
import { moneyApiJson } from "@/lib/money-fetch";
import {
  inputCls,
  MoneySettingsBackLink,
  secondaryBtnCls,
  SettingsSection,
} from "@/components/money-settings/money-settings-shared";

type TagRow = { id: string; name: string };

export function MoneySettingsTagsSection() {
  const notify = useNotify();
  const [tags, setTags] = useState<TagRow[]>([]);
  const [newTag, setNewTag] = useState("");
  const [bootstrapErr, setBootstrapErr] = useState<string | null>(null);

  const loadTags = useCallback(async () => {
    const { data } = await moneyApiJson<TagRow[]>("/api/money/tags");
    setTags(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          await loadTags();
        } catch (e: unknown) {
          if (!cancelled) {
            setBootstrapErr(e instanceof Error ? e.message : "Error");
          }
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [loadTags]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newTag.trim()) return;
    try {
      await moneyApiJson("/api/money/tags", {
        method: "POST",
        body: JSON.stringify({ name: newTag.trim() }),
      });
      setNewTag("");
      await loadTags();
      notify.success("Settings updated", "Tag added.");
    } catch (err: unknown) {
      notify.error(
        "Couldn’t save settings",
        err instanceof Error ? err.message : "Something went wrong",
      );
    }
  }

  return (
    <>
      <MoneySettingsBackLink />
      {bootstrapErr ? (
        <Alert
          variant="error"
          title="Unable to load"
          description={bootstrapErr}
          className="mb-8"
        />
      ) : null}
      <SettingsSection id="money-settings-tags-page" title="Tags">
        <form className="flex max-w-xl flex-col gap-3" onSubmit={onSubmit}>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">Name</span>
            <input
              className={inputCls}
              placeholder="vacation"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
            />
          </label>
          <button type="submit" className={`${secondaryBtnCls} self-start`}>
            Add tag
          </button>
        </form>
        <div className="mt-8 border-t border-border pt-8">
          <h3 className="text-sm font-medium text-foreground">Existing tags</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {tags.map((t) => (
              <li
                key={t.id}
                className="rounded-lg border border-border bg-background px-3 py-2"
              >
                {t.name}
              </li>
            ))}
          </ul>
        </div>
      </SettingsSection>
    </>
  );
}
