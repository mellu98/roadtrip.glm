// Automatic categorization of packing list items
const CATEGORY_RULES = [
  { id: 'clothing', label: 'Clothing', icon: '👕', keywords: ['maglia', 'camicia', 'pantaloni', 'vestito', 'giacca', 'cappotto', 'scarpe', 'calzini', 'biancheria', 'intimo', 'costume', 'bikini', 'cappello', 'guanti', 'sciarpa', 'felpa', 'jeans', 'short', 'sneaker', 'sandalo', 'shirt', 'pant', 'dress', 'jacket', 'coat', 'shoe', 'sock', 'underwear', 'swimsuit', 'hat', 'glove', 'scarf', 'sweater', 'shorts'] },
  { id: 'electronics', label: 'Electronics', icon: '📱', keywords: ['telefono', 'caricabatterie', 'cavo', 'fotocamera', 'macchina fotografica', 'laptop', 'computer', 'tablet', 'cuffie', 'auricolari', 'powerbank', 'batteria', 'adattatore', 'presa', 'phone', 'charger', 'cable', 'camera', 'headphone', 'earbuds', 'battery', 'adapter', 'plug'] },
  { id: 'documents', label: 'Documents', icon: '📋', keywords: ['passaporto', 'documento', 'patente', 'carta d\'identità', 'biglietto', 'assicurazione', 'visto', 'carta', 'pass', 'passport', 'license', 'id', 'ticket', 'insurance', 'visa'] },
  { id: 'hygiene', label: 'Hygiene', icon: '🧴', keywords: ['sapone', 'shampoo', 'bagnoschiuma', 'dentifricio', 'spazzolino', 'deodorante', 'crema', 'sole', 'protettiva', 'rasoio', 'asciugamano', 'soap', 'shampoo', 'toothpaste', 'toothbrush', 'deodorant', 'cream', 'sunscreen', 'towel', 'lotion'] },
  { id: 'health', label: 'Health', icon: '💊', keywords: ['medicinali', 'farmaco', 'pillola', 'cerotto', 'kit pronto soccorso', 'medicine', 'drug', 'pill', 'bandage', 'first aid', 'antidolorifico', 'antibiotico'] },
  { id: 'accessories', label: 'Accessories', icon: '🎒', keywords: ['borsetta', 'zaino', 'valigia', 'occhiali', 'ombrello', 'borsa', 'portafoglio', 'chiavi', 'bag', 'backpack', 'suitcase', 'glasses', 'umbrella', 'wallet', 'key', 'luggage'] },
  { id: 'other', label: 'Other', icon: '📦', keywords: [] },
]

/**
 * Categorize a packing list item by keyword matching
 */
export function categorizeItem(item) {
  const lower = item.toLowerCase()
  for (const cat of CATEGORY_RULES) {
    if (cat.keywords.some(kw => lower.includes(kw))) {
      return cat
    }
  }
  return CATEGORY_RULES.find(c => c.id === 'other')
}

/**
 * Returns all categories
 */
export function getCategories() {
  return CATEGORY_RULES
}

/**
 * Predefined packing templates by trip type
 */
const PACKING_TEMPLATES = {
  beach: {
    name: '🏖️ Beach',
    items: [
      'Swimsuit', 'Sunscreen SPF 50', 'Sunglasses',
      'Hat', 'Beach towel', 'Sandals',
      'Beach bag', 'E-reader', 'Water bottle',
      'Light t-shirts', 'Shorts', 'Flip-flops',
    ]
  },
  mountain: {
    name: '🏔️ Mountain',
    items: [
      'Hiking boots', 'Rain jacket', 'Long pants',
      'Thermal sweater', 'Technical socks', 'Gloves',
      'Wool hat', 'Water bottle', 'First aid kit',
      'Sunscreen', 'Sunglasses', 'Backpack',
    ]
  },
  city: {
    name: '🏛️ City',
    items: [
      'Comfortable shoes', 'Map or guidebook', 'Power bank',
      'Charger', 'Sunglasses', 'Day bag',
      'Wallet', 'Documents', 'Headphones',
      'Bottiglia d\'acqua', 'Compact umbrella', 'Light sweater',
    ]
  },
  business: {
    name: '💼 Business',
    items: [
      'Laptop', 'Charger', 'Plug adapter',
      'Travel documents', 'Tickets', 'ID card',
      'Formal wear', 'Dress shoes', 'Business cards',
      'Paperweight', 'Briefcase', 'Headphones',
    ]
  },
}

/**
 * Returns all available templates
 */
export function getPackingTemplates() {
  return PACKING_TEMPLATES
}

/**
 * Apply a template, merging with existing AI items (no duplicates)
 */
export function mergeWithAIList(aiList, templateItems) {
  const existingLower = new Set(aiList.map(item => item.toLowerCase().trim()))
  const newItems = templateItems.filter(item => !existingLower.has(item.toLowerCase().trim()))
  return [...aiList, ...newItems]
}
