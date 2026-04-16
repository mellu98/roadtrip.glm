import pb from '../lib/pb'

export async function generateItinerary(formData) {
  try {
    const record = await pb.send('/api/generate', {
      method: 'POST',
      body: { formData }
    })

    // The backend returns the full trip with id
    return {
      id: record.id,
      title: record.title,
      summary: record.summary,
      totalEstimatedCost: record.totalEstimatedCost,
      tips: record.tips || [],
      packingList: record.packingList || [],
      days: record.days || [],
      remaining: record.remaining,
    }
  } catch (err) {
    const message = err?.response?.data?.message || err?.message || 'Failed to generate itinerary'
    throw new Error(message)
  }
}

export async function regenerateDayServer(tripId, dayIndex, preferences = {}) {
  try {
    const result = await pb.send('/api/regenerate-day', {
      method: 'POST',
      body: { tripId, dayIndex, preferences }
    })
    return result.day
  } catch (err) {
    const message = err?.response?.data?.message || err?.message || 'Failed to regenerate day'
    throw new Error(message)
  }
}

export async function regenerateActivityServer(tripId, dayIndex, activityId, preferences = {}) {
  try {
    const result = await pb.send('/api/regenerate-activity', {
      method: 'POST',
      body: { tripId, dayIndex, activityId, preferences }
    })
    return result.activity
  } catch (err) {
    const message = err?.response?.data?.message || err?.message || 'Failed to regenerate activity'
    throw new Error(message)
  }
}

export async function sendChatMessage(tripId, messages) {
  try {
    const result = await pb.send('/api/chat', {
      method: 'POST',
      body: { tripId, messages }
    })
    return result.content
  } catch (err) {
    const message = err?.response?.data?.message || err?.message || 'Chat error'
    throw new Error(message)
  }
}
