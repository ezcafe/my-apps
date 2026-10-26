export type BabyImportKind = "profile" | "care" | "growth" | "vaccines";

const BABY_IMPORT_KIND_LIST = [
  "profile",
  "care",
  "growth",
  "vaccines",
] as const satisfies readonly BabyImportKind[];

/** Dependency order for Import all / Export all. */
export const BABY_IMPORT_ALL_ORDER = [
  "profile",
  "care",
  "growth",
  "vaccines",
] as const satisfies readonly BabyImportKind[];

export function isBabyImportKind(value: string): value is BabyImportKind {
  return (BABY_IMPORT_KIND_LIST as readonly string[]).includes(value);
}

export const babyImportSectionTitle: Record<BabyImportKind, string> = {
  profile: "Profile",
  care: "Care events",
  growth: "Growth",
  vaccines: "Vaccines",
};

export type BabyImportFieldDef = {
  key: string;
  label: string;
  required: boolean;
};

export function babyImportFieldDefs(kind: BabyImportKind): BabyImportFieldDef[] {
  switch (kind) {
    case "profile":
      return [
        { key: "displayName", label: "Display name", required: false },
        { key: "birthDate", label: "Birth date (YYYY-MM-DD)", required: false },
      ];
    case "care":
      return [
        { key: "type", label: "Type (feed / diaper / sleep)", required: true },
        { key: "occurredAt", label: "Occurred at", required: true },
        { key: "endedAt", label: "Ended at", required: false },
        { key: "payloadJson", label: "Payload JSON", required: false },
      ];
    case "growth":
      return [
        { key: "kind", label: "Kind", required: true },
        { key: "occurredAt", label: "Occurred at", required: true },
        { key: "value", label: "Value", required: false },
        { key: "unit", label: "Unit", required: false },
        { key: "notes", label: "Notes", required: false },
      ];
    case "vaccines":
      return [
        { key: "name", label: "Vaccine name", required: true },
        { key: "dose", label: "Dose (first / second)", required: false },
        { key: "scheduledAt", label: "Scheduled at", required: false },
        { key: "givenAt", label: "Given at", required: false },
        { key: "notes", label: "Notes", required: false },
      ];
    default: {
      const _x: never = kind;
      return _x;
    }
  }
}
