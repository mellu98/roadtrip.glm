import { useState } from 'react'
import { Button, Input, Checkbox, Progress, Chip } from '@heroui/react'
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
  } catch {}
}

export default function PackingList() {
  const { currentItinerary: itinerary } = useTripStore()
  const tripId = itinerary?.id

  const [packingState, setPackingState] = useState(() => {
    if (!tripId) return {}
    const saved = getPackingState(tripId)
    if (Object.keys(saved).length > 0) return saved
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

  const categories = getCategories()
  const grouped = categories
    .map(cat => ({
      ...cat,
      items: allItems.filter(item => item.category.id === cat.id),
    }))
    .filter(cat => cat.items.length > 0)

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
    const newState = { ...packingState }
    delete newState[`custom_${index}`]
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
    const newCustom = merged.filter(
      item => !(itinerary?.packingList || []).includes(item)
    )
    setCustomItems(newCustom)

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
    <div className="mt-6 pt-6 border-t border-default-200">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h3 className="font-heading text-lg flex items-center gap-2">
          <i className="fas fa-suitcase-rolling text-primary" /> Packing List
        </h3>
        <div className="flex items-center gap-2 min-w-[140px]">
          <span className="text-xs text-default-500 font-semibold whitespace-nowrap">
            {checkedItems}/{totalItems}
          </span>
          <Progress
            size="sm"
            value={progress}
            color="primary"
            aria-label="Packing progress"
            className="w-20"
          />
        </div>
      </div>

      <Button
        variant="bordered"
        className="w-full border-dashed mb-3"
        startContent={<i className="fas fa-plus-circle" />}
        onPress={() => setShowTemplates(!showTemplates)}
        size="sm"
      >
        Add from template
      </Button>

      {showTemplates && (
        <div className="flex flex-wrap gap-2 mb-3">
          {Object.entries(templates).map(([key, tmpl]) => (
            <Chip
              key={key}
              variant="flat"
              color="primary"
              className="cursor-pointer hover:opacity-80"
              onClick={() => applyTemplate(key)}
            >
              {tmpl.name}
            </Chip>
          ))}
        </div>
      )}

      {grouped.map(cat => (
        <div key={cat.id} className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{cat.icon}</span>
            <span className="font-semibold text-foreground">{cat.label}</span>
            <span className="text-xs text-default-500 ml-auto">
              {cat.items.filter(i => packingState[i.id]).length}/{cat.items.length}
            </span>
          </div>
          <ul className="space-y-1">
            {cat.items.map(item => (
              <li
                key={item.id}
                className="flex items-center gap-2 py-1 group"
              >
                <Checkbox
                  isSelected={!!packingState[item.id]}
                  onValueChange={() => toggleItem(item.id)}
                  size="sm"
                  classNames={{
                    label: packingState[item.id] ? 'line-through text-default-400' : 'text-foreground',
                  }}
                >
                  {item.text}
                </Checkbox>
                {item.isCustom && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    className="ml-auto opacity-0 group-hover:opacity-100"
                    onPress={() => removeCustomItem(parseInt(item.id.split('_')[1]))}
                    aria-label="Remove item"
                  >
                    <i className="fas fa-times text-default-400" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="flex gap-2 mt-4">
        <Input
          size="sm"
          value={newItem}
          onValueChange={setNewItem}
          onKeyDown={e => e.key === 'Enter' && addCustomItem()}
          placeholder="Add an item..."
          variant="bordered"
        />
        <Button
          color="primary"
          isIconOnly
          onPress={addCustomItem}
          isDisabled={!newItem.trim()}
          aria-label="Add"
        >
          <i className="fas fa-plus" />
        </Button>
      </div>
    </div>
  )
}
