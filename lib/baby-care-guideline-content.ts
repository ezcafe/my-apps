export const BABY_CARE_GUIDE_STAGE_IDS = [
  "newborn",
  "m1_3",
  "m3_6",
  "m6_12",
  "m12_24",
] as const;

export type BabyCareGuideStageId = (typeof BABY_CARE_GUIDE_STAGE_IDS)[number];

export const BABY_CARE_GUIDE_SUBSECTION_IDS = [
  "sleep",
  "nutrition",
  "who",
  "health",
  "diaper",
] as const;

export type BabyCareGuideSubsectionId =
  (typeof BABY_CARE_GUIDE_SUBSECTION_IDS)[number];

export type BabyCareGuidelineSubsection = {
  id: BabyCareGuideSubsectionId;
  title: string;
  /** Body lines (bullets split; plain paragraphs are one line). */
  lines: string[];
};

export type BabyCareGuidelineStage = {
  id: BabyCareGuideStageId;
  title: string;
  subsections: BabyCareGuidelineSubsection[];
};

export type BabyCareGuidelineModel = {
  mode: "full" | "placeholder";
  sectionI: {
    title: string;
    intro: string;
    roomTempTitle: string;
    roomTemp: string;
    bodyTempTitle: string;
    bodyTempLines: string[];
    sidsTitle: string;
    sids: string;
  };
  sectionIITitle: string;
  stages: BabyCareGuidelineStage[];
  placeholder: string;
  caveat: string;
};

function splitBodyLines(body: string): string[] {
  const trimmed = body.trim();
  if (!trimmed) return [];
  const lines = trimmed
    .split("\n")
    .map((line) => line.replace(/^-\s+/, "").trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : [trimmed];
}

type Translate = (key: string) => string;

/** Build quiet guideline model from i18n keys (EN + VI full content). */
export function buildBabyCareGuidelineModel(
  t: Translate,
  locale: string,
): BabyCareGuidelineModel {
  void locale;
  const sectionI = {
    title: t("home.guide.sectionI.title"),
    intro: t("home.guide.sectionI.intro"),
    roomTempTitle: t("home.guide.sectionI.roomTempTitle"),
    roomTemp: t("home.guide.sectionI.roomTemp"),
    bodyTempTitle: t("home.guide.sectionI.bodyTempTitle"),
    bodyTempLines: [
      t("home.guide.sectionI.bodyTempAxilla"),
      t("home.guide.sectionI.bodyTempRectal"),
    ].filter(Boolean),
    sidsTitle: t("home.guide.sectionI.sidsTitle"),
    sids: t("home.guide.sectionI.sids"),
  };

  const stages: BabyCareGuidelineStage[] = BABY_CARE_GUIDE_STAGE_IDS.map(
    (id) => ({
      id,
      title: t(`home.guide.stage.${id}.title`),
      subsections: BABY_CARE_GUIDE_SUBSECTION_IDS.map((sub) => ({
        id: sub,
        title: t(`home.guide.stage.${id}.${sub}.title`),
        lines: splitBodyLines(
          t(`home.guide.stage.${id}.${sub}.body`),
        ),
      })),
    }),
  );

  return {
    mode: "full",
    sectionI,
    sectionIITitle: t("home.guide.sectionII.title"),
    stages,
    placeholder: t("home.guide.enPlaceholder"),
    caveat: t("home.guideCaveat"),
  };
}
