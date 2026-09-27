"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFormatDate } from "@/lib/format-date";
import { queryErrorMessage } from "@/lib/user-facing-error";
import {
  babyTimelineBoundsForDrillDay,
  filterTimelineRowsForDrill,
  type BabyChartDrilldownPayload,
} from "@/lib/baby-chart-drilldown";
import { babyTimelineQueryOptions } from "@/lib/baby-query-options";

export function BabyChartDrilldownModal({
  open,
  onClose,
  drill,
}: {
  open: boolean;
  onClose: () => void;
  drill: BabyChartDrilldownPayload | null;
}) {
  const { formatDate } = useFormatDate();
  const day = drill?.day;
  const bounds = day ? babyTimelineBoundsForDrillDay(day) : null;
  const listQuery = useQuery({
    ...babyTimelineQueryOptions(bounds?.from, bounds?.to),
    enabled: open && Boolean(bounds),
  });

  const rows = useMemo(() => {
    const items = listQuery.data?.babyTimeline.items ?? [];
    if (!drill) return [];
    return filterTimelineRowsForDrill(items, drill);
  }, [listQuery.data, drill]);

  const modalTitleId = "baby-chart-drilldown-title";

  return (
    <Modal
      open={open && Boolean(drill)}
      onClose={onClose}
      bare
      labelledBy={modalTitleId}
      className="w-[min(100vw-2rem,42rem)] max-h-[min(100dvh-2rem,36rem)] overflow-hidden p-0"
    >
      <div className="flex h-full max-h-[min(100dvh-2rem,36rem)] min-h-0 flex-col">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 id={modalTitleId} className="font-display text-lg font-medium">
              {drill?.title ?? "Activities"}
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              {listQuery.isSuccess
                ? `${rows.length} event${rows.length === 1 ? "" : "s"}`
                : "Loading…"}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
          {listQuery.isLoading ? (
            <div className="flex flex-col gap-2" aria-busy="true">
              <Skeleton className="h-8 w-full rounded-[var(--radius-sm)]" />
              <Skeleton className="h-8 w-full rounded-[var(--radius-sm)]" />
            </div>
          ) : listQuery.isError ? (
            <p className="p-1 text-sm text-destructive" role="alert">
              {queryErrorMessage(listQuery.error) ?? "Could not load events"}
            </p>
          ) : rows.length === 0 ? (
            <p className="p-1 text-sm text-muted">No events for this slice.</p>
          ) : (
            <Table maxHeight="100%" className="min-h-0 flex-1">
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDate(row.at)}</TableCell>
                    <TableCell className="capitalize">{row.type}</TableCell>
                    <TableCell className="max-w-[14rem] truncate">
                      {row.summary ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <footer className="flex shrink-0 justify-end gap-2 border-t border-border px-4 py-3">
          <Button type="button" size="sm" onClick={onClose}>
            Close
          </Button>
        </footer>
      </div>
    </Modal>
  );
}
