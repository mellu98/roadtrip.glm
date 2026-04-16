/// <reference path="../pb_data/types.d.ts" />

// Migration: Create trips and daily_usage collections

// === TRIPS COLLECTION ===
migrate((app) => {
  const tripsCollection = new Collection({
    name: "trips",
    type: "base",
    system: false,
    fields: [
      {
        system: false,
        id: "user_relation",
        name: "user",
        type: "relation",
        required: true,
        options: {
          collectionId: "_pb_users_auth_",
          cascadeDelete: true,
          minSelect: null,
          maxSelect: 1,
          displayFields: ["email"]
        }
      },
      {
        system: false,
        id: "title_field",
        name: "title",
        type: "text",
        required: true,
        options: {
          min: null,
          max: 200,
          pattern: ""
        }
      },
      {
        system: false,
        id: "destination_field",
        name: "destination",
        type: "text",
        required: true,
        options: {
          min: null,
          max: 200,
          pattern: ""
        }
      },
      {
        system: false,
        id: "startdate_field",
        name: "startDate",
        type: "date",
        required: false,
        options: {
          datetime: false
        }
      },
      {
        system: false,
        id: "enddate_field",
        name: "endDate",
        type: "date",
        required: false,
        options: {
          datetime: false
        }
      },
      {
        system: false,
        id: "formdata_field",
        name: "formData",
        type: "json",
        required: false,
        options: {}
      },
      {
        system: false,
        id: "itinerary_field",
        name: "itinerary",
        type: "json",
        required: true,
        options: {}
      }
    ],
    indexes: [
      "CREATE INDEX idx_trips_user ON trips (user)",
      "CREATE INDEX idx_trips_destination ON trips (destination)"
    ],
    listRule: "@request.auth.id != '' && user = @request.auth.id",
    viewRule: "@request.auth.id != '' && user = @request.auth.id",
    createRule: "@request.auth.id != '' && user = @request.auth.id",
    updateRule: "@request.auth.id != '' && user = @request.auth.id",
    deleteRule: "@request.auth.id != '' && user = @request.auth.id"
  });

  app.dao().saveCollection(tripsCollection);

  // === DAILY_USAGE COLLECTION ===
  const usageCollection = new Collection({
    name: "daily_usage",
    type: "base",
    system: false,
    fields: [
      {
        system: false,
        id: "usage_user_relation",
        name: "user",
        type: "relation",
        required: true,
        options: {
          collectionId: "_pb_users_auth_",
          cascadeDelete: true,
          minSelect: null,
          maxSelect: 1,
          displayFields: ["email"]
        }
      },
      {
        system: false,
        id: "usage_date_field",
        name: "date",
        type: "text",
        required: true,
        options: {
          min: 10,
          max: 10,
          pattern: "^\\d{4}-\\d{2}-\\d{2}$"
        }
      },
      {
        system: false,
        id: "usage_count_field",
        name: "count",
        type: "number",
        required: true,
        options: {
          min: 0,
          max: 100
        }
      }
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_daily_usage_user_date ON daily_usage (user, date)"
    ],
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: ""
  });

  app.dao().saveCollection(usageCollection);
}, (app) => {
  // Down: remove collections
  try {
    const tripsCollection = app.dao().findCollectionByNameOrId("trips");
    app.dao().deleteCollection(tripsCollection);
  } catch (e) {}

  try {
    const usageCollection = app.dao().findCollectionByNameOrId("daily_usage");
    app.dao().deleteCollection(usageCollection);
  } catch (e) {}
});
