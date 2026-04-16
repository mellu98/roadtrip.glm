import { regenerateDayServer, regenerateActivityServer } from './ai'

/**
 * Regenerate a single day of the itinerary
 */
export async function regenerateDay(context, dayIndex, preferences = {}) {
  // Get tripId from the context (PocketBase record id)
  const tripId = context.id || context.pbId
  if (!tripId) {
    throw new Error('Trip ID not found — save your trip first')
  }
  return regenerateDayServer(tripId, dayIndex, preferences)
}

/**
 * Regenerate a single activity
 */
export async function regenerateActivity(context, activityId, preferences = {}) {
  const tripId = context.id || context.pbId
  if (!tripId) {
    throw new Error('Trip ID not found — save your trip first')
  }
  return regenerateActivityServer(tripId, findDayIndex(context, activityId), activityId, preferences)
}

/**
 * Regenerate only the restaurants for a day
 */
export async function regenerateMeals(context, dayIndex) {
  const day = context.days[dayIndex]
  const mealActivities = day.activities?.filter(a => a.type === 'restaurant') || []

  return regenerateDay(context, dayIndex, {
    focus: 'meals',
    instruction: `Replace ALL restaurants with different and better alternatives. Keep the same meal times (breakfast, lunch, dinner). There are ${mealActivities.length} restaurants to replace.`,
    keepTypes: ['attraction', 'activity', 'transport', 'accommodation'],
  })
}

function findDayIndex(context, activityId) {
  for (let d = 0; d < context.days.length; d++) {
    if (context.days[d].activities?.find(a => a.id === activityId)) {
      return d
    }
  }
  return 0
}
