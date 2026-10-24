import type { CompleteChat } from "@/features/foods/server/analyze-foods";

function foodsLlmConfig() {
  const baseUrl = process.env.FOODS_LLM_BASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.FOODS_LLM_API_KEY;
  const model = process.env.FOODS_LLM_MODEL ?? "gpt-4o-mini";
  return { baseUrl, apiKey, model };
}

/** OpenAI-compatible chat completions. */
export function createFoodsCompleteChat(): CompleteChat {
  return async (prompt: string) => {
    const { baseUrl, apiKey, model } = foodsLlmConfig();
    if (!baseUrl || !apiKey) {
      throw new Error("FOODS_LLM_BASE_URL and FOODS_LLM_API_KEY are required");
    }
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a food-variety coach. Reply with JSON only. Not medical advice.",
          },
          { role: "user", content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`LLM HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM returned empty content");
    return content;
  };
}
