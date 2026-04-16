/// <reference path="../pb_data/types.d.ts" />

// POST /api/chat — Chat assistant endpoint
// Requires authentication. Shares the daily rate limit with generate.
routerAdd("POST", "/api/chat", (c) => {
  const authRecord = $apis.requestInfo(c).authRecord;
  if (!authRecord) {
    throw new UnauthorizedError("Authentication required");
  }

  checkAndIncrementRateLimit(authRecord.id);

  const body = $apis.requestInfo(c).body;
  const { tripId, messages } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new BadRequestError("Messages array is required");
  }

  // Build context from trip if provided
  let systemPrompt = "You are an expert travel assistant. Respond in English. Be concise but helpful. If you suggest a place, include the real name.";

  if (tripId) {
    try {
      const record = $app.dao().findFirstRecordByData("trips", "id", tripId);
      if (record.getString("user") !== authRecord.id) {
        throw new ForbiddenError("Not your trip");
      }

      const formData = JSON.parse(record.getString("formData") || "{}");
      const itinerary = JSON.parse(record.getString("itinerary") || "{}");

      const days = (itinerary.days || []).map(function(d) {
        const acts = (d.activities || []).map(function(a) { return a.time + " " + a.name + " (" + a.type + ")"; }).join(", ");
        return "Day " + d.dayNumber + " (" + d.date + "): " + acts;
      }).join("\n");

      systemPrompt = "You are an expert travel assistant. The user is planning this trip:\n\n"
        + "Destination: " + (itinerary.destination || formData.destination) + "\n"
        + "Title: " + (itinerary.title || "") + "\n"
        + "Dates: " + (formData.startDate || "") + " to " + (formData.endDate || "") + "\n"
        + "Budget: " + (formData.currency || "EUR") + " " + (formData.budget || "") + "\n"
        + "Style: " + (formData.travelStyle ? formData.travelStyle.join(", ") : "mixed") + "\n"
        + "Interests: " + (formData.interests ? formData.interests.join(", ") : "general") + "\n\n"
        + "ITINERARY:\n" + days + "\n\n"
        + "Respond in English. Be concise but helpful. If you suggest a place, include the real name.";
    } catch (e) {
      // If trip not found or other error, use default system prompt
      console.warn("[Chat] Could not load trip context: " + e.message);
    }
  }

  // Build message array for OpenRouter
  const chatMessages = [{ role: "system", content: systemPrompt }];
  // Take last 6 user/assistant messages for context
  const recentMessages = messages.slice(-6);
  for (let i = 0; i < recentMessages.length; i++) {
    chatMessages.push(recentMessages[i]);
  }

  const content = callOpenRouter(chatMessages, 1000, 0.7);

  return c.json(200, {
    content: content,
    remaining: 0 // TODO: calculate remaining if needed
  });
}, $apis.requireAuth());
