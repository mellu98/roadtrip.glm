import PocketBase from 'pocketbase'

const PB_URL = import.meta.env.VITE_POCKETBASE_URL || 'https://roadtrip.app.easlydev.online'

const pb = new PocketBase(PB_URL)

// Auto-cancel pending requests on page navigation
pb.autoCancellation(false)

export default pb
