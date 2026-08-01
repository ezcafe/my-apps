"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

export type MoneyMenuPageAction = {
  id: string;
  label: string;
  variant?: "default" | "danger";
  onSelect: () => void;
};

let actions: MoneyMenuPageAction[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function registerMoneyMenuPageAction(
  action: MoneyMenuPageAction,
): () => void {
  actions = [...actions.filter((a) => a.id !== action.id), action];
  emit();
  return () => {
    actions = actions.filter((a) => a.id !== action.id);
    emit();
  };
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function getSnapshot(): MoneyMenuPageAction[] {
  return actions;
}

function getServerSnapshot(): MoneyMenuPageAction[] {
  return [];
}

export function useMoneyMenuPageActions(): MoneyMenuPageAction[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Registers a page-specific item into the Money Menu while mounted. */
export function useRegisterMoneyMenuPageAction(
  action: Omit<MoneyMenuPageAction, "onSelect"> & { onSelect: () => void } | null,
): void {
  const onSelectRef = useRef(action?.onSelect);

  useEffect(() => {
    onSelectRef.current = action?.onSelect;
  }, [action?.onSelect]);

  const id = action?.id;
  const label = action?.label;
  const variant = action?.variant;

  useEffect(() => {
    if (id == null || label == null) return;
    return registerMoneyMenuPageAction({
      id,
      label,
      variant,
      onSelect: () => {
        onSelectRef.current?.();
      },
    });
  }, [id, label, variant]);
}
