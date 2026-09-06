import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createBabyVaccine,
  deleteBabyVaccine,
  listBabyVaccines,
  updateBabyVaccine,
  type BabyVaccineRow,
  type VaccineDeps,
} from "@/features/baby/server/vaccines";
import {
  babyVaccineListInputSchema,
  createBabyVaccineSchema,
  updateBabyVaccineSchema,
} from "@/lib/validators/baby";

const babyId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherWorkspaceId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const userSub = "caregiver-1";

function memoryDeps(seed: {
  rows?: BabyVaccineRow[];
}): VaccineDeps & { rows: BabyVaccineRow[] } {
  const rows: BabyVaccineRow[] = seed.rows ? [...seed.rows] : [];

  return {
    rows,
    ensureBabyProfile: async () => ({ id: babyId }),
    insertVaccine: async (values) => {
      const now = new Date();
      const row: BabyVaccineRow = {
        id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(rows.length + 1).padStart(12, "0")}`,
        workspaceId: values.workspaceId,
        babyId: values.babyId,
        name: values.name,
        dose: values.dose,
        administeredAt: values.administeredAt,
        notes: values.notes,
        source: values.source,
        createdByUserSub: values.createdByUserSub,
        updatedByUserSub: values.updatedByUserSub,
        createdAt: now,
        updatedAt: now,
      };
      rows.push(row);
      return row;
    },
    listVaccines: async (ws, filter) => {
      let items = rows.filter((r) => r.workspaceId === ws);
      if (filter.from) {
        items = items.filter((r) => r.administeredAt >= filter.from!);
      }
      if (filter.to) {
        items = items.filter((r) => r.administeredAt <= filter.to!);
      }
      if (filter.cursor) {
        const at = new Date(filter.cursor.atMs);
        items = items.filter(
          (r) =>
            r.administeredAt < at ||
            (r.administeredAt.getTime() === at.getTime() &&
              r.id < filter.cursor!.id),
        );
      }
      items.sort((a, b) => {
        const diff = b.administeredAt.getTime() - a.administeredAt.getTime();
        if (diff !== 0) return diff;
        return b.id.localeCompare(a.id);
      });
      return items.slice(0, filter.limit);
    },
    findVaccine: async (ws, id) =>
      rows.find((r) => r.id === id && r.workspaceId === ws) ?? null,
    updateVaccine: async (ws, id, patch) => {
      const idx = rows.findIndex((r) => r.id === id && r.workspaceId === ws);
      if (idx < 0) return null;
      const next = { ...rows[idx]!, ...patch };
      rows[idx] = next;
      return next;
    },
    deleteVaccine: async (ws, id) => {
      const idx = rows.findIndex((r) => r.id === id && r.workspaceId === ws);
      if (idx < 0) return null;
      const [removed] = rows.splice(idx, 1);
      return removed!;
    },
  };
}

describe("createBabyVaccineSchema", () => {
  it("requires trimmed non-empty name and dose first|second", () => {
    assert.equal(
      createBabyVaccineSchema.safeParse({ name: "Hexaxim", dose: "first" })
        .success,
      true,
    );
    assert.equal(
      createBabyVaccineSchema.safeParse({ name: "  ", dose: "first" }).success,
      false,
    );
    assert.equal(
      createBabyVaccineSchema.safeParse({ name: "Hexaxim", dose: "third" })
        .success,
      false,
    );
  });
});

describe("updateBabyVaccineSchema", () => {
  it("requires id uuid", () => {
    assert.equal(
      updateBabyVaccineSchema.safeParse({ id: "not-uuid" }).success,
      false,
    );
    assert.equal(
      updateBabyVaccineSchema.safeParse({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        dose: "second",
      }).success,
      true,
    );
  });
});

describe("babyVaccineListInputSchema", () => {
  it("rejects inverted from/to and bad limits", () => {
    assert.equal(
      babyVaccineListInputSchema.safeParse({ limit: 0 }).success,
      false,
    );
    assert.equal(
      babyVaccineListInputSchema.safeParse({
        from: "2026-09-30T00:00:00.000Z",
        to: "2026-09-01T00:00:00.000Z",
      }).success,
      false,
    );
    assert.equal(
      babyVaccineListInputSchema.safeParse({
        from: "2026-09-01T00:00:00.000Z",
        to: "2026-09-30T00:00:00.000Z",
        limit: 20,
      }).success,
      true,
    );
  });
});

describe("vaccine services (mocked store)", () => {
  it("createBabyVaccine inserts a workspace-scoped row", async () => {
    const deps = memoryDeps({});
    const row = await createBabyVaccine(
      workspaceId,
      userSub,
      { name: "Hexaxim", dose: "first" },
      deps,
    );
    assert.equal(row.name, "Hexaxim");
    assert.equal(row.dose, "first");
    assert.equal(row.workspaceId, workspaceId);
    assert.equal(row.babyId, babyId);
    assert.equal(deps.rows.length, 1);
  });

  it("listBabyVaccines returns only this workspace and pages with nextCursor", async () => {
    const deps = memoryDeps({});
    await createBabyVaccine(
      workspaceId,
      userSub,
      {
        name: "A",
        dose: "first",
        administeredAt: "2026-09-03T00:00:00.000Z",
      },
      deps,
    );
    await createBabyVaccine(
      workspaceId,
      userSub,
      {
        name: "B",
        dose: "second",
        administeredAt: "2026-09-02T00:00:00.000Z",
      },
      deps,
    );
    await createBabyVaccine(
      otherWorkspaceId,
      userSub,
      {
        name: "Other",
        dose: "first",
        administeredAt: "2026-09-04T00:00:00.000Z",
      },
      deps,
    );

    const scoped = await listBabyVaccines(workspaceId, { limit: 10 }, deps);
    assert.deepEqual(
      scoped.items.map((r) => r.name),
      ["A", "B"],
    );
    assert.equal(scoped.nextCursor, null);

    const first = await listBabyVaccines(workspaceId, { limit: 1 }, deps);
    assert.equal(first.items.length, 1);
    assert.equal(first.items[0]!.name, "A");
    assert.ok(first.nextCursor);

    const second = await listBabyVaccines(
      workspaceId,
      { limit: 1, cursor: first.nextCursor },
      deps,
    );
    assert.equal(second.items.length, 1);
    assert.equal(second.items[0]!.name, "B");
    // Full page still yields a cursor; next fetch is empty.
    assert.ok(second.nextCursor);
    const third = await listBabyVaccines(
      workspaceId,
      { limit: 1, cursor: second.nextCursor },
      deps,
    );
    assert.equal(third.items.length, 0);
    assert.equal(third.nextCursor, null);
  });

  it("listBabyVaccines filters by inclusive from/to administeredAt", async () => {
    const deps = memoryDeps({});
    await createBabyVaccine(
      workspaceId,
      userSub,
      {
        name: "Before",
        dose: "first",
        administeredAt: "2026-08-31T23:59:59.000Z",
      },
      deps,
    );
    await createBabyVaccine(
      workspaceId,
      userSub,
      {
        name: "InRange",
        dose: "first",
        administeredAt: "2026-09-15T12:00:00.000Z",
      },
      deps,
    );
    await createBabyVaccine(
      workspaceId,
      userSub,
      {
        name: "After",
        dose: "second",
        administeredAt: "2026-10-01T00:00:00.000Z",
      },
      deps,
    );

    const ranged = await listBabyVaccines(
      workspaceId,
      {
        from: "2026-09-01T00:00:00.000Z",
        to: "2026-09-30T23:59:59.000Z",
        limit: 10,
      },
      deps,
    );
    assert.deepEqual(
      ranged.items.map((r) => r.name),
      ["InRange"],
    );

    const fromOnly = await listBabyVaccines(
      workspaceId,
      { from: "2026-09-15T12:00:00.000Z", limit: 10 },
      deps,
    );
    assert.deepEqual(
      fromOnly.items.map((r) => r.name),
      ["After", "InRange"],
    );

    const toOnly = await listBabyVaccines(
      workspaceId,
      { to: "2026-09-15T12:00:00.000Z", limit: 10 },
      deps,
    );
    assert.deepEqual(
      toOnly.items.map((r) => r.name),
      ["InRange", "Before"],
    );
  });

  it("listBabyVaccines rejects a malformed cursor", async () => {
    const deps = memoryDeps({});
    await assert.rejects(
      () =>
        listBabyVaccines(
          workspaceId,
          { limit: 10, cursor: "!!!" },
          deps,
        ),
      (e: unknown) =>
        e instanceof Error && e.message === "Validation failed: bad cursor",
    );
  });

  it("listBabyVaccines treats null cursor as first page", async () => {
    const deps = memoryDeps({});
    await createBabyVaccine(
      workspaceId,
      userSub,
      { name: "Hexaxim", dose: "first" },
      deps,
    );
    const page = await listBabyVaccines(
      workspaceId,
      { limit: 10, cursor: null },
      deps,
    );
    assert.equal(page.items.length, 1);
    assert.equal(page.items[0]!.name, "Hexaxim");
  });

  it("updateBabyVaccine patches dose; cross-workspace id is NOT_FOUND", async () => {
    const deps = memoryDeps({});
    const created = await createBabyVaccine(
      workspaceId,
      userSub,
      { name: "Hexaxim", dose: "first" },
      deps,
    );
    const updated = await updateBabyVaccine(
      workspaceId,
      userSub,
      { id: created.id, dose: "second" },
      deps,
    );
    assert.equal(updated.dose, "second");

    await assert.rejects(
      () =>
        updateBabyVaccine(
          otherWorkspaceId,
          userSub,
          { id: created.id, dose: "first" },
          deps,
        ),
      (e: unknown) => e instanceof Error && e.message === "NOT_FOUND",
    );
  });

  it("deleteBabyVaccine removes row; missing / wrong workspace → NOT_FOUND", async () => {
    const deps = memoryDeps({});
    const created = await createBabyVaccine(
      workspaceId,
      userSub,
      { name: "Hexaxim", dose: "first" },
      deps,
    );
    const deleted = await deleteBabyVaccine(workspaceId, created.id, deps);
    assert.equal(deleted.id, created.id);
    assert.equal(deps.rows.length, 0);

    await assert.rejects(
      () => deleteBabyVaccine(workspaceId, created.id, deps),
      (e: unknown) => e instanceof Error && e.message === "NOT_FOUND",
    );

    const again = await createBabyVaccine(
      workspaceId,
      userSub,
      { name: "Keep", dose: "second" },
      deps,
    );
    await assert.rejects(
      () => deleteBabyVaccine(otherWorkspaceId, again.id, deps),
      (e: unknown) => e instanceof Error && e.message === "NOT_FOUND",
    );
    assert.equal(deps.rows.length, 1);
  });
});
