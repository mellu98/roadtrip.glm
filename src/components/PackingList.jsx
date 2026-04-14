import { useState } from 'react'
import { useTripStore } from '../store/tripStore'
import { categorizeItem, getCategories, getPackingTemplates, mergeWithAIList } from '../utils/packing'

const STORAGE_KEY = 'roadtrip_packing_state'

function getPackingState(tripId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const all = raw ? JSON.parse(raw) : {}
    return all[tripId] || {}
  } catch {
    return {}
  }
}

function savePackingState(tripId, state) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const all = raw ? JSON.parse(raw) : {}
    all[tripId] = state
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // localStorage pieno, ignora
  }
}

export default function PackingList() {
  const { currentItinerary: itinerary } = useTripStore()
  const tripId = itinerary?.id

  const [packingState, setPackingState] = useState(() => {
    if (!tripId) return {}
    const saved = getPackingState(tripId)
    // Se ci sono già stati salvati, usali; altrimenti inizializza
    if (Object.keys(saved).length > 0) return saved
    // Inizializza tutti gli item come non spuntati
    const initial = {}
    itinerary?.packingList?.forEach((item, i) => {
      initial[`ai_${i}`] = false
    })
    return initial
  })

  const [customItems, setCustomItems] = useState(() => {
    if (!tripId) return []
    const saved = getPackingState(tripId)
    return saved._customItems || []
  })

  const [newItem, setNewItem] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)

  // Costruisci la lista completa: AI items + custom items
  const aiItems = (itinerary?.packingList || []).map((item, i) => ({
    id: `ai_${i}`,
    text: item,
    category: categorizeItem(item),
    isCustom: false,
  }))

  const customListItems = customItems.map((item, i) => ({
    id: `custom_${i}`,
    text: item,
    category: categorizeItem(item),
    isCustom: true,
  }))

  const allItems = [...aiItems, ...customListItems]

  // Raggruppa per categoria
  const categories = getCategories()
  const grouped = categories
    .map(cat => ({
      ...cat,
      items: allItems.filter(item => item.category.id === cat.id),
    }))
    .filter(cat => cat.items.length > 0)

  // Conteggi
  const totalItems = allItems.length
  const checkedItems = allItems.filter(item => packingState[item.id]).length
  const progress = totalItems > 0 ? (checkedItems / totalItems) * 100 : 0

  const toggleItem = (id) => {
    const newState = { ...packingState, [id]: !packingState[id] }
    setPackingState(newState)
    if (tripId) savePackingState(tripId, { ...newState, _customItems: customItems })
  }

  const addCustomItem = () => {
    const text = newItem.trim()
    if (!text) return
    const newCustom = [...customItems, text]
    setCustomItems(newCustom)
    const id = `custom_${customItems.length}`
    const newState = { ...packingState, [id]: false }
    setPackingState(newState)
    setNewItem('')
    if (tripId) savePackingState(tripId, { ...newState, _customItems: newCustom })
  }

  const removeCustomItem = (index) => {
    const newCustom = customItems.filter((_, i) => i !== index)
    setCustomItems(newCustom)
    // Rimuovi anche lo stato
    const newState = { ...packingState }
    delete newState[`custom_${index}`]
    // Ri-indicizza i custom rimanenti
    newCustom.forEach((_, i) => {
      const oldId = `custom_${i}`
      const shiftId = `custom_${i + 1}`
      if (i >= index && newState[shiftId] !== undefined) {
        newState[oldId] = newState[shiftId]
        delete newState[shiftId]
      }
    })
    setPackingState(newState)
    if (tripId) savePackingState(tripId, { ...newState, _customItems: newCustom })
  }

  const applyTemplate = (templateKey) => {
    const templates = getPackingTemplates()
    const template = templates[templateKey]
    if (!template) return

    const existingItems = [...(itinerary?.packingList || []), ...customItems]
    const merged = mergeWithAIList(existingItems, template.items)
    // I nuovi item sono quelli non già presenti nei custom
    const newCustom = merged.filter(
      item => !(itinerary?.packingList || []).includes(item)
    )
    setCustomItems(newCustom)

    // Inizializza i nuovi item come non spuntati
    const newState = { ...packingState }
    newCustom.forEach((_, i) => {
      newState[`custom_${i}`] = false
    })
    setPackingState(newState)

    if (tripId) savePackingState(tripId, { ...newState, _customItems: newCustom })
    setShowTemplates(false)
  }

  const templates = getPackingTemplates()

  return (
    <div className="packing-list">
      <div className="packing-header">
        <h3><i className="fas fa-suitcase-rolling"></i> Cosa Portare</h3>
        <div className="packing-progress-container">
          <div className="packing-progress-text">
            {checkedItems}/{totalItems} item
          </div>
          <div className="packing-progress-bar">
            <div
              className="packing-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Template button */}
      <button
        className="packing-template-btn"
        onClick={() => setShowTemplates(!showTemplates)}
      >
        <i className="fas fa-plus-circle"></i> Aggiungi da template
      </button>

      {showTemplates && (
        <div className="packing-templates">
          {Object.entries(templates).map(([key, tmpl]) => (
            <button
              key={key}
              className="packing-template-option"
              onClick={() => applyTemplate(key)}
            >
              {tmpl.name}
            </button>
          ))}
        </div>
      )}

      {/* Categorie */}
      {grouped.map(cat => (
        <div key={cat.id} className="packing-category">
          <div className="packing-category-header">
            <span className="packing-category-icon">{cat.icon}</span>
            <span className="packing-category-label">{cat.label}</span>
            <span className="packing-category-count">
              {cat.items.filter(i => packingState[i.id]).length}/{cat.items.length}
            </span>
          </div>
          <ul className="packing-items">
            {cat.items.map(item => (
              <li key={item.id} className={`packing-item ${packingState[item.id] ? 'checked' : ''}`}>
                <label className="packing-item-label">
                  <input
                    type="checkbox"
                    checked={!!packingState[item.id]}
                    onChange={() => toggleItem(item.id)}
                  />
                  <span className="packing-item-text">{item.text}</span>
                </label>
                {item.isCustom && (
                  <button
                    className="packing-item-remove"
                    onClick={() => removeCustomItem(parseInt(item.id.split('_')[1]))}
                    title="Rimuovi"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Aggiungi item personalizzato */}
      <div className="packing-add">
        <input
          type="text"
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCustomItem()}
          placeholder="Aggiungi un item..."
        />
        <button className="btn-primary btn-sm" onClick={addCustomItem} disabled={!newItem.trim()}>
          <i className="fas fa-plus"></i>
        </button>
      </div>
    </div>
  )
}
