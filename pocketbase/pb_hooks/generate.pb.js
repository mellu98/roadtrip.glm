/// <reference path="../pb_data/types.d.ts" />

// POST /api/generate — Generate a full itinerary
// Requires authentication. Rate limited to 10/day.
routerAdd("POST", "/api/generate", (c) => {
  const authRecord = $apis.requestInfo(c).authRecord;
  if (!authRecord) {
    throw new UnauthorizedError("Authentication required");
  }

  // Rate limit check
  const remaining = checkAndIncrementRateLimit(authRecord.id);

  const body = $apis.requestInfo(c).body;
  const formData = body.formData || body;

  // Validate required fields
  if (!formData.destination) {
    throw new BadRequestError("Destination is required");
  }
  if (!formData.duration || formData.duration < 1) {
    throw new BadRequestError("Duration must be at least 1 day");
  }
  if (!formData.budget || formData.budget < 1) {
    throw new BadRequestError("Budget must be greater than 0");
  }

  const systemPrompt = buildGenerateSystemPrompt();
  const userPrompt = buildGenerateUserPrompt(formData);

  const content = callOpenRouter([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ], 16000, 0.8);

  const itinerary = parseJsonResponse(content);
  validateItinerary(itinerary, formData);

  // Save trip to database
  const collection = $app.dao().findCollectionByNameOrId("trips");
  const record = new Record(collection);
  record.set("user", authRecord.id);
  record.set("title", itinerary.title || formData.destination + " Trip");
  record.set("destination", formData.destination);
  record.set("startDate", formData.startDate || "");
  record.set("endDate", formData.endDate || "");
  record.set("formData", JSON.stringify(formData));
  record.set("itinerary", JSON.stringify(itinerary));
  $app.dao().saveRecord(record);

  return c.json(200, {
    id: record.id,
    title: itinerary.title,
    summary: itinerary.summary || "",
    totalEstimatedCost: itinerary.totalEstimatedCost || null,
    tips: itinerary.tips || [],
    packingList: itinerary.packingList || [],
    days: itinerary.days || [],
    remaining: MAX_DAILY_GENERATIONS - remaining
  });
}, $apis.requireAuth());

// POST /api/regenerate-day — Regenerate a single day
routerAdd("POST", "/api/regenerate-day", (c) => {
  const authRecord = $apis.requestInfo(c).authRecord;
  if (!authRecord) {
    throw new UnauthorizedError("Authentication required");
  }

  checkAndIncrementRateLimit(authRecord.id);

  const body = $apis.requestInfo(c).body;
  const { tripId, dayIndex, preferences } = body;

  if (!tripId || dayIndex === undefined) {
    throw new BadRequestError("tripId and dayIndex are required");
  }

  // Load trip from DB
  let record;
  try {
    record = $app.dao().findFirstRecordByData("trips", "id", tripId);
  } catch (e) {
    throw new BadRequestError("Trip not found");
  }

  // Verify ownership
  if (record.getString("user") !== authRecord.id) {
    throw new ForbiddenError("Not your trip");
  }

  const formData = JSON.parse(record.getString("formData") || "{}");
  const itinerary = JSON.parse(record.getString("itinerary") || "{}");
  const day = itinerary.days[dayIndex];

  if (!day) {
    throw new BadRequestError("Invalid day index");
  }

  const prefs = preferences || {};
  const systemPrompt = buildRegenerateDaySystemPrompt();
  const userPrompt = buildRegenerateDayUserPrompt(formData, itinerary, dayIndex, prefs);

  const content = callOpenRouter([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ], 8000, 0.8);

  const newDay = parseJsonResponse(content);

  // Update itinerary in DB
  itinerary.days[dayIndex] = { ...newDay, dayNumber: dayIndex + 1 };
  record.set("itinerary", JSON.stringify(itinerary));
  $app.dao().saveRecord(record);

  return c.json(200, { day: itinerary.days[dayIndex] });
}, $apis.requireAuth());

// POST /api/regenerate-activity — Regenerate a single activity
routerAdd("POST", "/api/regenerate-activity", (c) => {
  const authRecord = $apis.requestInfo(c).authRecord;
  if (!authRecord) {
    throw new UnauthorizedError("Authentication required");
  }

  checkAndIncrementRateLimit(authRecord.id);

  const body = $apis.requestInfo(c).body;
  const { tripId, dayIndex, activityId, preferences } = body;

  if (!tripId || dayIndex === undefined || !activityId) {
    throw new BadRequestError("tripId, dayIndex, and activityId are required");
  }

  let record;
  try {
    record = $app.dao().findFirstRecordByData("trips", "id", tripId);
  } catch (e) {
    throw new BadRequestError("Trip not found");
  }

  if (record.getString("user") !== authRecord.id) {
    throw new ForbiddenError("Not your trip");
  }

  const formData = JSON.parse(record.getString("formData") || "{}");
  const itinerary = JSON.parse(record.getString("itinerary") || "{}");
  const day = itinerary.days[dayIndex];
  const activity = day.activities.find(a => a.id === activityId);

  if (!activity) {
    throw new BadRequestError("Activity not found");
  }

  const prefs = preferences || {};
  const systemPrompt = buildRegenerateActivitySystemPrompt();
  const userPrompt = buildRegenerateActivityUserPrompt(formData, day, activity, prefs);

  const content = callOpenRouter([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ], 2000, 0.8);

  const newActivity = parseJsonResponse(content);

  // Update
  const actIdx = day.activities.findIndex(a => a.id === activityId);
  itinerary.days[dayIndex].activities[actIdx] = { ...newActivity, id: activityId };
  record.set("itinerary", JSON.stringify(itinerary));
  $app.dao().saveRecord(record);

  return c.json(200, { activity: itinerary.days[dayIndex].activities[actIdx] });
}, $apis.requireAuth());

// --- Prompt Builders ---

function buildGenerateSystemPrompt() {
  return `Respond in English. All place names, descriptions, tips, and content must be in English.

You are an expert travel planner with deep knowledge of destinations worldwide. You create detailed, practical, and exciting travel itineraries.

CRITICAL: You MUST respond with ONLY valid JSON. No markdown, no code blocks, no extra text. Just the raw JSON object.

The JSON must follow this exact schema:
{
  "title": "Catchy trip title",
  "summary": "2-3 sentence overview of the trip experience",
  "totalEstimatedCost": { "amount": 0, "currency": "EUR" },
  "tips": ["Practical travel tip 1", "Tip 2", "Tip 3"],
  "packingList": ["Essential item 1", "Item 2"],
  "days": [
    {
      "dayNumber": 1,
      "date": "YYYY-MM-DD",
      "theme": "Short day theme like 'Arrival & Ancient Wonders'",
      "overview": "1-2 sentence summary of the day",
      "activities": [
        {
          "id": "d1a1",
          "type": "attraction|restaurant|transport|activity",
          "name": "Actual real place name",
          "description": "2-3 sentences about this place",
          "time": "09:00",
          "duration": "2h",
          "location": {
            "lat": 0.0,
            "lng": 0.0,
            "address": "Real street address"
          },
          "price": { "amount": 0, "currency": "EUR", "type": "per person|total|free" },
          "rating": 4.5,
          "reviews": 1200,
          "hours": "09:00 - 18:00",
          "phone": "+39 0xx xxx xxxx",
          "website": "https://...",
          "tips": ["Specific useful tip"],
          "cuisine": "Cuisine type (restaurants only)",
          "mealType": "breakfast|lunch|dinner (restaurants only)"
        }
      ],
      "dailyCost": { "amount": 0, "currency": "EUR" }
    }
  ]
}

RULES:
- Use REAL place names, real addresses, real coordinates (approximate is fine)
- Include 2-3 meals per day (breakfast/lunch/dinner) with REAL restaurant names
- Include realistic opening hours and prices in local currency
- Distribute 4-6 activities per day logically by proximity and time
- Consider travel time between locations
- Mix must-see attractions with hidden gems
- Stay within the specified budget
- Every activity needs a unique id like "d1a1", "d1a2", etc.
- Latitude/longitude must be approximate real coordinates for the destination
- Make it exciting, practical, and well-balanced`;
}

function buildGenerateUserPrompt(formData) {
  const parts = [
    "Destination: " + formData.destination,
    "Dates: " + (formData.startDate || "flexible") + " to " + (formData.endDate || "flexible"),
    "Duration: " + formData.duration + " days",
    "Budget: " + (formData.currency || "EUR") + " " + formData.budget + " total for the entire trip"
  ];

  if (formData.travelStyle && formData.travelStyle.length > 0) {
    parts.push("Travel style: " + formData.travelStyle.join(", "));
  }
  if (formData.companions) {
    parts.push("Traveling with: " + formData.companions);
  }
  if (formData.interests && formData.interests.length > 0) {
    parts.push("Interests: " + formData.interests.join(", "));
  }
  if (formData.dietaryRestrictions) {
    parts.push("Dietary restrictions: " + formData.dietaryRestrictions);
  }
  if (formData.mobilityNeeds) {
    parts.push("Mobility/accessibility needs: " + formData.mobilityNeeds);
  }
  if (formData.mustSee) {
    parts.push("Must-see places: " + formData.mustSee);
  }
  if (formData.additionalNotes) {
    parts.push("Additional notes: " + formData.additionalNotes);
  }
  if (formData.destinationLat && formData.destinationLng) {
    parts.push("Coordinates: " + formData.destinationLat + ", " + formData.destinationLng);
  }

  parts.push("\nGenerate a complete, detailed day-by-day itinerary as JSON.");
  return parts.join("\n");
}

function buildRegenerateDaySystemPrompt() {
  return `Respond in English.

You are an expert travel planner. You are regenerating a SINGLE DAY of an existing itinerary.

CRITICAL: You MUST respond with ONLY valid JSON. No markdown, no code blocks.

The JSON must follow this schema:
{
  "dayNumber": 1,
  "date": "YYYY-MM-DD",
  "theme": "Short day theme",
  "overview": "1-2 sentence summary",
  "activities": [
    {
      "id": "d1a1",
      "type": "attraction|restaurant|transport|activity",
      "name": "Real place name",
      "description": "2-3 sentences",
      "time": "09:00",
      "duration": "2h",
      "location": { "lat": 0.0, "lng": 0.0, "address": "Real address" },
      "price": { "amount": 0, "currency": "EUR", "type": "per person|total|free" },
      "rating": 4.5,
      "hours": "09:00-18:00",
      "tips": ["Tip"]
    }
  ],
  "dailyCost": { "amount": 0, "currency": "EUR" }
}

RULES:
- Use REAL place names, addresses, coordinates
- Include 2-3 meals per day
- Distribute 4-6 activities logically
- Stay within the original budget
- Every activity needs a unique id`;
}

function buildRegenerateDayUserPrompt(formData, itinerary, dayIndex, prefs) {
  const day = itinerary.days[dayIndex];
  let prompt = "I'm regenerating Day " + day.dayNumber + " of my trip to " + formData.destination + ".\n\n";
  prompt += "TRIP CONTEXT:\n";
  prompt += "- Destination: " + formData.destination + "\n";
  prompt += "- Budget: " + (formData.currency || "EUR") + " " + formData.budget + " total\n";
  prompt += "- Travel style: " + (formData.travelStyle ? formData.travelStyle.join(", ") : "mixed") + "\n";
  prompt += "- Interests: " + (formData.interests ? formData.interests.join(", ") : "general") + "\n\n";
  prompt += "CURRENT DAY TO REGENERATE:\n";
  prompt += "- Date: " + day.date + "\n";
  prompt += "- Theme: " + day.theme + "\n\n";

  if (prefs.focus === "meals") {
    prompt += "SPECIAL INSTRUCTION: " + (prefs.instruction || "Replace all restaurants") + "\n\n";
    prompt += "NON-RESTAURANT activities to KEEP (do not change these):\n";
    day.activities.forEach(function(act) {
      if (act.type !== "restaurant") {
        prompt += "- " + act.time + " " + act.name + " (" + act.type + ")\n";
      }
    });
    prompt += "\nGenerate ONLY the replacement restaurant activities plus the kept activities, returning the complete day.";
  } else {
    prompt += "Generate a completely new plan for this day with different places and activities.";
    if (prefs.instruction) {
      prompt += "\n\nAdditional instructions: " + prefs.instruction;
    }
  }

  if (dayIndex > 0) {
    const prevDay = itinerary.days[dayIndex - 1];
    prompt += "\n\nPREVIOUS DAY activities (avoid duplicates): " + prevDay.activities.map(function(a) { return a.name; }).join(", ");
  }
  if (dayIndex < itinerary.days.length - 1) {
    const nextDay = itinerary.days[dayIndex + 1];
    prompt += "\nNEXT DAY activities (avoid duplicates): " + nextDay.activities.map(function(a) { return a.name; }).join(", ");
  }

  return prompt;
}

function buildRegenerateActivitySystemPrompt() {
  return `Respond in English.

You are an expert travel planner. You are regenerating a SINGLE ACTIVITY in an existing itinerary day.

CRITICAL: You MUST respond with ONLY valid JSON. No markdown, no code blocks.

The JSON must be a single activity object:
{
  "id": "d1a1",
  "type": "attraction|restaurant|transport|activity",
  "name": "Real place name",
  "description": "2-3 sentences",
  "time": "09:00",
  "duration": "2h",
  "location": { "lat": 0.0, "lng": 0.0, "address": "Real address" },
  "price": { "amount": 0, "currency": "EUR", "type": "per person|total|free" },
  "rating": 4.5,
  "hours": "09:00-18:00",
  "tips": ["Tip"]
}

RULES:
- Use REAL place names and addresses
- Keep the same time slot as the original activity
- Keep the same type unless instructed otherwise
- Must be a different place from the original
- Coordinates must be approximate real coordinates`;
}

function buildRegenerateActivityUserPrompt(formData, day, activity, prefs) {
  let prompt = "I'm replacing a single activity in my trip to " + formData.destination + ".\n\n";
  prompt += "DAY CONTEXT:\n";
  prompt += "- Date: " + day.date + "\n";
  prompt += "- Other activities this day: " + day.activities.filter(function(a) { return a.id !== activity.id; }).map(function(a) { return a.time + " " + a.name; }).join(", ") + "\n\n";
  prompt += "ACTIVITY TO REPLACE:\n";
  prompt += "- Name: " + activity.name + "\n";
  prompt += "- Type: " + activity.type + "\n";
  prompt += "- Time: " + activity.time + "\n";
  prompt += "- Duration: " + activity.duration + "\n\n";

  if (prefs.instruction) {
    prompt += "SPECIAL INSTRUCTION: " + prefs.instruction + "\n\n";
  } else {
    prompt += "Generate a DIFFERENT " + activity.type + " at the same time slot (" + activity.time + ").\n";
  }

  prompt += '\nReturn a single activity object with id "' + activity.id + '".';
  return prompt;
}

// --- Validation ---

function validateItinerary(data, formData) {
  if (!data.days || !Array.isArray(data.days) || data.days.length === 0) {
    throw new BadRequestError("Invalid itinerary: missing days");
  }

  for (let i = 0; i < data.days.length; i++) {
    const day = data.days[i];
    if (!day.activities || !Array.isArray(day.activities)) {
      throw new BadRequestError("Day " + (i + 1) + " has no activities");
    }
    for (let j = 0; j < day.activities.length; j++) {
      const act = day.activities[j];
      if (!act.id) act.id = "d" + (i + 1) + "a" + (j + 1);
      if (!act.location) act.location = { lat: 0, lng: 0, address: "" };
      if (!act.price) act.price = { amount: 0, currency: formData.currency || "EUR", type: "free" };
    }
  }
}
