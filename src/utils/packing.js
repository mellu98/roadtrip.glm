// Categorizzazione automatica degli item della packing list
const CATEGORY_RULES = [
  { id: 'clothing', label: 'Abbigliamento', icon: '👕', keywords: ['maglia', 'camicia', 'pantaloni', 'vestito', 'giacca', 'cappotto', 'scarpe', 'calzini', 'biancheria', 'intimo', 'costume', 'bikini', 'cappello', 'guanti', 'sciarpa', 'felpa', 'jeans', 'short', 'sneaker', 'sandalo', 'shirt', 'pant', 'dress', 'jacket', 'coat', 'shoe', 'sock', 'underwear', 'swimsuit', 'hat', 'glove', 'scarf', 'sweater', 'shorts'] },
  { id: 'electronics', label: 'Elettronica', icon: '📱', keywords: ['telefono', 'caricabatterie', 'cavo', 'fotocamera', 'macchina fotografica', 'laptop', 'computer', 'tablet', 'cuffie', 'auricolari', 'powerbank', 'batteria', 'adattatore', 'presa', 'phone', 'charger', 'cable', 'camera', 'headphone', 'earbuds', 'battery', 'adapter', 'plug'] },
  { id: 'documents', label: 'Documenti', icon: '📋', keywords: ['passaporto', 'documento', 'patente', 'carta d\'identità', 'biglietto', 'assicurazione', 'visto', 'carta', 'pass', 'passport', 'license', 'id', 'ticket', 'insurance', 'visa'] },
  { id: 'hygiene', label: 'Igiene', icon: '🧴', keywords: ['sapone', 'shampoo', 'bagnoschiuma', 'dentifricio', 'spazzolino', 'deodorante', 'crema', 'sole', 'protettiva', 'rasoio', 'asciugamano', 'soap', 'shampoo', 'toothpaste', 'toothbrush', 'deodorant', 'cream', 'sunscreen', 'towel', 'lotion'] },
  { id: 'health', label: 'Salute', icon: '💊', keywords: ['medicinali', 'farmaco', 'pillola', 'cerotto', 'kit pronto soccorso', 'medicine', 'drug', 'pill', 'bandage', 'first aid', 'antidolorifico', 'antibiotico'] },
  { id: 'accessories', label: 'Accessori', icon: '🎒', keywords: ['borsetta', 'zaino', 'valigia', 'occhiali', 'ombrello', 'borsa', 'portafoglio', 'chiavi', 'bag', 'backpack', 'suitcase', 'glasses', 'umbrella', 'wallet', 'key', 'luggage'] },
  { id: 'other', label: 'Altro', icon: '📦', keywords: [] },
]

/**
 * Categorizza un item della packing list per keyword matching
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
 * Restituisce tutte le categorie
 */
export function getCategories() {
  return CATEGORY_RULES
}

/**
 * Template di packing predefiniti per tipo di viaggio
 */
const PACKING_TEMPLATES = {
  beach: {
    name: '🏖️ Spiaggia',
    items: [
      'Costume da bagno', 'Crema solare SPF 50', 'Occhiali da sole',
      'Cappello', 'Asciugamano da spiaggia', 'Sandali',
      'Borsa da spiaggia', 'Lettore di libri', 'Borraccia',
      'Magliette leggere', 'Shorts', 'Ciabatte',
    ]
  },
  mountain: {
    name: '🏔️ Montagna',
    items: [
      'Scarpe da trekking', 'Giacca impermeabile', 'Pantaloni lunghi',
      'Felpa termica', 'Calzini tecnici', 'Guanti',
      'Cappello di lana', 'Borraccia', 'Kit primo soccorso',
      'Crema solare', 'Occhiali da sole', 'Zaino',
    ]
  },
  city: {
    name: '🏛️ Città',
    items: [
      'Scarpe comode', 'Mappa o guida', 'Powerbank',
      'Caricabatterie', 'Occhiali da sole', 'Borsa giornaliera',
      'Portafoglio', 'Documenti', 'Cuffie',
      'Bottiglia d\'acqua', 'Ombrello pieghevole', 'Felpa leggera',
    ]
  },
  business: {
    name: '💼 Business',
    items: [
      'Computer portatile', 'Caricabatterie', 'Adattatore presa',
      'Documenti di viaggio', 'Biglietti', 'Carta d\'identità',
      'Abbigliamento formale', 'Scarpe eleganti', 'Biglietti da visita',
      'Fermacarte', 'Borsa lavoro', 'Cuffie',
    ]
  },
}

/**
 * Restituisce tutti i template disponibili
 */
export function getPackingTemplates() {
  return PACKING_TEMPLATES
}

/**
 * Applica un template, unendolo con gli item AI esistenti (no duplicati)
 */
export function mergeWithAIList(aiList, templateItems) {
  const existingLower = new Set(aiList.map(item => item.toLowerCase().trim()))
  const newItems = templateItems.filter(item => !existingLower.has(item.toLowerCase().trim()))
  return [...aiList, ...newItems]
}
