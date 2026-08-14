"use client";

import { presentClientError, toUserFacingMessage } from "@/lib/user-facing-error";
import { useCallback, useEffect, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import {
  MONEY_LIST_TAGS_QUERY,
  MONEY_TAG_CREATE_MUTATION,
  MONEY_TAG_DELETE_MUTATION,
  MONEY_TAG_UPDATE_MUTATION,
} from "@/lib/money-gql-documents";
import {
  SettingsSection,
} from "@/components/money-settings/money-settings-shared";

type TagRow = { id: string; name: string };

export function MoneySettingsTagsSection() {
  const notify = useNotify();
  const [tags, setTags] = useState<TagRow[]>([]);
  const [newTag, setNewTag] = useState("");
  const [bootstrapErr, setBootstrapErr] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const loadTags = useCallback(async () => {
    const res = await moneyGraphQLRequest<{ moneyTags: TagRow[] }>(MONEY_LIST_TAGS_QUERY);
    setTags(res.moneyTags);
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          await loadTags();
        } catch (e: unknown) {
          if (!cancelled) {
            setBootstrapErr(presentClientError("money-settings-tags", e));
          }
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [loadTags]);

  function startEdit(t: TagRow) {
    setEditingId(t.id);
    setEditName(t.name);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editName.trim()) return;
    try {
      await moneyGraphQLRequest(MONEY_TAG_UPDATE_MUTATION, {
        id: editingId,
        input: { name: editName.trim() },
      });
      cancelEdit();
      await loadTags();
      notify.success("Settings updated", "Tag saved.");
    } catch (err: unknown) {
      notify.error(
        "Couldn’t save settings",
        toUserFacingMessage(err, "Something went wrong"),
      );
    }
  }

  async function deleteTag(id: string, name: string) {
    if (!window.confirm(`Delete tag “${name}”? This cannot be undone.`)) {
      return;
    }
    try {
      await moneyGraphQLRequest(MONEY_TAG_DELETE_MUTATION, { id });
      if (editingId === id) cancelEdit();
      await loadTags();
      notify.success("Settings updated", "Tag deleted.");
    } catch (err: unknown) {
      notify.error(
        "Couldn’t delete tag",
        toUserFacingMessage(err, "Something went wrong"),
      );
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newTag.trim()) return;
    try {
      await moneyGraphQLRequest(MONEY_TAG_CREATE_MUTATION, {
        input: { name: newTag.trim() },
      });
      setNewTag("");
      await loadTags();
      notify.success("Settings updated", "Tag added.");
    } catch (err: unknown) {
      notify.error(
        "Couldn’t save settings",
        toUserFacingMessage(err, "Something went wrong"),
      );
    }
  }

  return (
    <>
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
          <Field label="Name" required>
            <Input
              placeholder="vacation"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              required
            />
          </Field>
          <Button type="submit" variant="primary" className="self-start">
            Add tag
          </Button>
        </form>
        <div className="mt-8 border-t border-border pt-8">
          <h3 className="text-sm font-medium text-foreground">Existing tags</h3>
          <ul className="mt-3 divide-y divide-border rounded-[var(--radius-sm)] bg-background text-sm text-muted">
            {tags.map((t) => (
              <li key={t.id} className="px-3 py-2.5">
                {editingId === t.id ? (
                  <form className="flex flex-col gap-3" onSubmit={saveEdit}>
                    <Field label="Name" required>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                      />
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" variant="primary" size="sm">
                        Save
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-foreground">{t.name}</span>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(t)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => void deleteTag(t.id, t.name)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </SettingsSection>
    </>
  );
}
