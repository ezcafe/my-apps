import type { FoodType, MealSlot } from "@/lib/validators/foods";

export type FoodsAnalysisEntry = {
  loggedOn: string;
  foodType: FoodType;
  mealSlot: MealSlot | null;
  note: string | null;
};

export type FoodsAnalysisParsed = {
  summary: string;
  suggestions: string[];
};

export type FoodsAnalysisRow = {
  summary: string;
  suggestions: string[];
  status: "ok" | "error";
  errorMessage: string | null;
};

/** Inclusive window: today − 6 calendar days through today (7 days). */
export function analysisWindowStart(todayYmd: string): string {
  const [y, m, d] = todayYmd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 6);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function filterEntriesInAnalysisWindow(
  entries: ReadonlyArray<FoodsAnalysisEntry>,
  todayYmd: string,
): FoodsAnalysisEntry[] {
  const start = analysisWindowStart(todayYmd);
  return entries.filter((e) => e.loggedOn >= start && e.loggedOn <= todayYmd);
}

export function buildFoodsAnalysisPrompt(
  entries: ReadonlyArray<FoodsAnalysisEntry>,
  todayYmd: string,
): string {
  const lines = entries.map((e) => {
    const slot = e.mealSlot ? ` (${e.mealSlot})` : "";
    const note = e.note ? ` — ${e.note}` : "";
    return `- ${e.loggedOn}${slot}: ${e.foodType}${note}`;
  });
  return [
    "You analyze food-type logs for variety and balance.",
    `Today is ${todayYmd}. Window is the last 7 calendar days including today.`,
    "Respond with JSON only: {\"summary\": string, \"suggestions\": string[]}.",
    "summary: short note on variety/balance of food types.",
    "suggestions: 2–5 concrete ideas for the next day (types to add or rotate).",
    "Not medical advice. Do not invent calories or nutrients.",
    "Logs:",
    ...lines,
  ].join("\n");
}

export function parseFoodsAnalysisResponse(raw: string): FoodsAnalysisParsed {
  const trimmed = raw.trim();
  const jsonText = extractJsonObject(trimmed);
  const data = JSON.parse(jsonText) as unknown;
  if (!data || typeof data !== "object") {
    throw new Error("analysis response is not an object");
  }
  const obj = data as Record<string, unknown>;
  const summary = obj.summary;
  const suggestions = obj.suggestions;
  if (typeof summary !== "string" || !summary.trim()) {
    throw new Error("analysis summary missing");
  }
  if (!Array.isArray(suggestions) || !suggestions.every((s) => typeof s === "string")) {
    throw new Error("analysis suggestions must be string[]");
  }
  return {
    summary: summary.trim(),
    suggestions: suggestions.map((s) => s.trim()).filter(Boolean),
  };
}

function extractJsonObject(text: string): string {
  if (text.startsWith("{")) return text;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

/** Keep prior ok body; mark status error (D2). */
export function upsertFoodAnalysisOnError(
  prior: FoodsAnalysisRow | null,
  errorMessage: string,
): FoodsAnalysisRow {
  if (prior && prior.status === "ok") {
    return {
      summary: prior.summary,
      suggestions: prior.suggestions,
      status: "error",
      errorMessage,
    };
  }
  if (prior) {
    return {
      summary: prior.summary,
      suggestions: prior.suggestions,
      status: "error",
      errorMessage,
    };
  }
  return {
    summary: "",
    suggestions: [],
    status: "error",
    errorMessage,
  };
}

export type CompleteChat = (prompt: string) => Promise<string>;

export async function runFoodsAnalysis(
  entries: ReadonlyArray<FoodsAnalysisEntry>,
  todayYmd: string,
  completeChat: CompleteChat,
): Promise<FoodsAnalysisParsed> {
  const inWindow = filterEntriesInAnalysisWindow(entries, todayYmd);
  const prompt = buildFoodsAnalysisPrompt(inWindow, todayYmd);
  const raw = await completeChat(prompt);
  return parseFoodsAnalysisResponse(raw);
}
