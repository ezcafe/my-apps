"use client";

import { presentClientError, toUserFacingMessage } from "@/lib/user-facing-error";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useNotify } from "@/components/notification-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import { SettingsSection } from "@/components/settings/settings-section";
import { SHELL_FULL_SPAN } from "@/lib/shell-layout";

type NamedEntityRow = { id: string; name: string };

export type MoneyNamedEntitySettingsConfig = {
  sectionId: string;
  title: string;
  description: string;
  entityLabel: string;
  entityLabelLower: string;
  existingHeading: string;
  addHeading: string;
  addButtonLabel: string;
  namePlaceholder: string;
  importHref: string;
  errorScope: string;
  listQuery: string;
  listKey: string;
  createMutation: string;
  updateMutation: string;
  deleteMutation: string;
};

export function MoneyNamedEntitySettingsSection({
  config,
}: {
  config: MoneyNamedEntitySettingsConfig;
}) {
  const notify = useNotify();
  const [rows, setRows] = useState<NamedEntityRow[]>([]);
  const [newName, setNewName] = useState("");
  const [bootstrapErr, setBootstrapErr] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const loadRows = useCallback(async () => {
    const res = await moneyGraphQLRequest<Record<string, NamedEntityRow[]>>(
      config.listQuery,
    );
    setRows(res[config.listKey] ?? []);
  }, [config.listKey, config.listQuery]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          await loadRows();
        } catch (e: unknown) {
          if (!cancelled) {
            setBootstrapErr(presentClientError(config.errorScope, e));
          }
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [config.errorScope, loadRows]);

  function startEdit(row: NamedEntityRow) {
    setEditingId(row.id);
    setEditName(row.name);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editName.trim()) return;
    try {
      await moneyGraphQLRequest(config.updateMutation, {
        id: editingId,
        input: { name: editName.trim() },
      });
      cancelEdit();
      await loadRows();
      notify.success(
        "Settings updated",
        `${config.entityLabel} saved.`,
      );
    } catch (err: unknown) {
      notify.error(
        "Couldn’t save settings",
        toUserFacingMessage(err, "Something went wrong"),
      );
    }
  }

  async function deleteRow(id: string, name: string) {
    if (
      !window.confirm(
        `Delete ${config.entityLabelLower} “${name}”? This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await moneyGraphQLRequest(config.deleteMutation, { id });
      if (editingId === id) cancelEdit();
      await loadRows();
      notify.success(
        "Settings updated",
        `${config.entityLabel} deleted.`,
      );
    } catch (err: unknown) {
      notify.error(
        `Couldn’t delete ${config.entityLabelLower}`,
        toUserFacingMessage(err, "Something went wrong"),
      );
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await moneyGraphQLRequest(config.createMutation, {
        input: { name: newName.trim() },
      });
      setNewName("");
      await loadRows();
      notify.success(
        "Settings updated",
        `${config.entityLabel} added.`,
      );
    } catch (err: unknown) {
      notify.error(
        "Couldn’t save settings",
        toUserFacingMessage(err, "Something went wrong"),
      );
    }
  }

  const addForm = (
    <form className="flex max-w-xl flex-col gap-3" onSubmit={onSubmit}>
      <Field label="Name" required>
        <Input
          placeholder={config.namePlaceholder}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          required
        />
      </Field>
      <Button type="submit" variant="primary" className="self-start">
        {config.addButtonLabel}
      </Button>
    </form>
  );

  return (
    <div className={SHELL_FULL_SPAN}>
      {bootstrapErr ? (
        <Alert
          variant="error"
          title="Unable to load"
          description={bootstrapErr}
          className="mb-8"
        />
      ) : null}
      <SettingsSection
        id={config.sectionId}
        title={config.title}
        description={config.description}
      >
        <p className="mb-4 text-sm text-muted">
          <Link
            href={config.importHref}
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Import from CSV
          </Link>
        </p>
        {rows.length > 0 ? (
          <>
            <h3 className="text-sm font-medium text-foreground">
              {config.existingHeading}
            </h3>
            <ul className="mt-3 divide-y divide-border rounded-[var(--radius-sm)] bg-background text-sm text-muted">
              {rows.map((row) => (
                <li key={row.id} className="px-3 py-2.5">
                  {editingId === row.id ? (
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-foreground">{row.name}</span>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(row)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => void deleteRow(row.id, row.name)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-8 border-t border-border pt-8">
              <h3 className="text-sm font-medium text-foreground">
                {config.addHeading}
              </h3>
              <div className="mt-3">{addForm}</div>
            </div>
          </>
        ) : (
          addForm
        )}
      </SettingsSection>
    </div>
  );
}
