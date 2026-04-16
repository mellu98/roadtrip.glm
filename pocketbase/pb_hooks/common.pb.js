/// <reference path="../pb_data/types.d.ts" />

// OpenRouter fallback chain — tries each free model in order
const MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "qwen/qwen-2.5-72b-instruct:free"
];

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_DAILY_GENERATIONS = 10;

/**
 * Call OpenRouter with fallback chain
 * Tries each model in order until one succeeds
 */
function callOpenRouter(messages, maxTokens = 16000, temperature = 0.8) {
  const apiKey = $os.getenv("OPENROUTER_API_KEY");
  if (!apiKey) {
    throw new BadRequestError("OpenRouter API key not configured on server");
  }

  let lastError = "";

  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];
    console.log(`[OpenRouter] Trying model: ${model}`);

    try {
      const response = $http.send({
        url: OPENROUTER_URL,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + apiKey,
          "HTTP-Referer": $os.getenv("APP_URL") || "http://localhost:8090",
          "X-Title": "RoadTrip Planner"
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: temperature,
          max_tokens: maxTokens,
          response_format: { type: "json_object" }
        }),
        timeout: 120
      });

      if (response.statusCode === 200) {
        const data = response.json;
        const content = data.choices && data.choices[0] && data.choices[0].message
          ? data.choices[0].message.content
          : null;

        if (content) {
          console.log(`[OpenRouter] Success with model: ${model}`);
          return content;
        }
        lastError = "Empty response content from " + model;
      } else {
        lastError = "HTTP " + response.statusCode + " from " + model + ": " + (response.raw || "").slice(0, 200);
        console.warn("[OpenRouter] " + lastError);
      }
    } catch (err) {
      lastError = "Request failed for " + model + ": " + err.message;
      console.warn("[OpenRouter] " + lastError);
    }
  }

  throw new BadRequestError("All models failed. Last error: " + lastError);
}

/**
 * Check and increment daily generation count for a user
 * Returns the current count after increment
 */
function checkAndIncrementRateLimit(userId) {
  const today = new Date().toISOString().split("T")[0];

  // Try to find existing record
  let record = null;
  try {
    record = $app.dao().findFirstRecordByData("daily_usage", "user", userId);
    if (record && record.getString("date") !== today) {
      // Different day — reset
      record.set("date", today);
      record.set("count", 0);
    }
  } catch (e) {
    // Record doesn't exist yet — will create below
  }

  if (record) {
    const currentCount = record.getInt("count");
    if (currentCount >= MAX_DAILY_GENERATIONS) {
      throw new BadRequestError("Daily generation limit reached (" + MAX_DAILY_GENERATIONS + "/day). Try again tomorrow.");
    }
    record.set("count", currentCount + 1);
    $app.dao().saveRecord(record);
    return currentCount + 1;
  }

  // Create new record
  const collection = $app.dao().findCollectionByNameOrId("daily_usage");
  record = new Record(collection);
  record.set("user", userId);
  record.set("date", today);
  record.set("count", 1);
  $app.dao().saveRecord(record);
  return 1;
}

/**
 * Parse JSON from LLM response, handling markdown code blocks
 */
function parseJsonResponse(raw) {
  let text = raw.trim();

  // Strip markdown code blocks
  if (text.indexOf("```") === 0) {
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  // First try
  try {
    return JSON.parse(text);
  } catch (e) {
    // Extract JSON block
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {
        // Try repairing truncated JSON
        return repairAndParse(match[0]);
      }
    }
    throw new BadRequestError("Unable to parse JSON response from AI");
  }
}

/**
 * Attempt to repair truncated JSON by closing open brackets
 */
function repairAndParse(text) {
  let cleaned = text.replace(/,\s*([}\]])/g, "$1");
  cleaned = cleaned.replace(/"[^"]*$/, "");
  cleaned = cleaned.replace(/,\s*$/, "");

  let opens = 0, openSq = 0, inString = false, escaped = false;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === "\"") { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") opens++;
    if (ch === "}") opens--;
    if (ch === "[") openSq++;
    if (ch === "]") openSq--;
  }

  while (openSq > 0) { cleaned += "]"; openSq--; }
  while (opens > 0) { cleaned += "}"; opens--; }

  return JSON.parse(cleaned);
}
