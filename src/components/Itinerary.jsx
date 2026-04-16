import { useState, useRef, useEffect, lazy, Suspense } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button, Card, CardBody, Chip, Input, Textarea, Select, SelectItem, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Tabs, Tab, Progress, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react'
import { useTripStore } from '../store/tripStore'
import { useUiStore } from '../store/uiStore'
import { openInMaps, openDirections, formatAddress } from '../utils/maps'
import { generatePDF } from '../utils/pdf'
import { exportJSON, exportICal, exportMarkdown } from '../utils/export'
import { regenerateDay, regenerateActivity, regenerateMeals } from '../utils/ai-partial'
import { optimizeRoute, calculateRouteDistance } from '../utils/routeOptimize'
import { WeatherCompact, WeatherExpanded } from './WeatherBadge'
import { getWeatherForDate } from '../utils/weather'
import PackingList from './PackingList'
import ShareModal from './ShareModal'

const MapView = lazy(() => import('./MapView'))
const BudgetTracker = lazy(() => import('./BudgetTracker'))
const ChatAssistant = lazy(() => import('./ChatAssistant'))

const TYPE_CONFIG = {
  attraction: { icon: '🏛️', color: '#6366f1', label: 'Attraction' },
  restaurant: { icon: '🍽️', color: '#0ea5e9', label: 'Restaurant' },
  transport: { icon: '🚗', color: '#64748b', label: 'Transport' },
  activity: { icon: '🎯', color: '#10b981', label: 'Activity' },
  accommodation: { icon: '🏨', color: '#8b5cf6', label: 'Accommodation' },
}

function getTypeConfig(type) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.activity
}

function formatPrice(price) {
  if (!price) return ''
  if (price.type === 'free') return 'Free'
  const amt = price.amount ? `${price.currency || ''} ${price.amount}` : ''
  const suffix = price.type === 'per person' ? '/person' : ''
  return amt + suffix
}

function formatRating(rating) {
  if (!rating) return null
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.3 && rating % 1 < 0.8
  const stars = '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0))
  return stars
}

function SortableActivityCard({ activity, idx, config, isSelected, onActivityClick, onMapClick, onDirectionsClick, isLast, isShared }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  }

  return (
    <div ref={setNodeRef} style={style} className="flex gap-3 relative">
      {/* Timeline line */}
      <div className="flex flex-col items-center w-8 flex-shrink-0">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
          style={{ background: config.color + '18', color: config.color }}
        >
          {config.icon}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 mt-1" style={{ background: config.color + '30' }} />
        )}
      </div>

      {/* Card */}
      <div className="flex-1 pb-4 flex gap-2 items-start">
        {!isShared && (
          <button
            className="mt-3 cursor-grab text-default-300 hover:text-default-500 active:cursor-grabbing flex-shrink-0"
            {...attributes}
            {...listeners}
            title="Drag to reorder"
          >
            <i className="fas fa-grip-vertical text-xs"></i>
          </button>
        )}
        <Card
          isPressable
          onPress={() => onActivityClick(activity)}
          className={`flex-1 transition-all border ${
            isSelected ? 'border-primary shadow-md ring-1 ring-primary/20' : 'border-default-200 hover:border-default-300'
          }`}
          shadow="sm"
        >
          <CardBody className="gap-1.5 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-default-500">{activity.time}</span>
              <Chip
                size="sm"
                variant="flat"
                style={{ background: config.color + '15', color: config.color }}
                classNames={{ content: 'text-xs' }}
              >
                {config.icon} {config.label}
              </Chip>
            </div>
            <h3 className="text-sm font-semibold text-foreground">{activity.name}</h3>
            <div className="flex items-center gap-3 text-xs text-default-500 flex-wrap">
              {activity.duration && <span><i className="fas fa-clock mr-1" />{activity.duration}</span>}
              {activity.price && <span><i className="fas fa-tag mr-1" />{formatPrice(activity.price)}</span>}
              {activity.rating && <span className="text-amber-500">★ {activity.rating}</span>}
            </div>
            {activity.cuisine && (
              <span className="text-xs text-default-500"><i className="fas fa-utensils mr-1" />{activity.cuisine}</span>
            )}
            {activity.description && (
              <p className="text-xs text-default-500 line-clamp-2">{activity.description}</p>
            )}
            <div className="flex gap-1.5 mt-1">
              <Button
                size="sm"
                variant="flat"
                className="h-6 text-xs px-2"
                startContent={<i className="fas fa-map-marker-alt text-xs" />}
                onClick={(e) => onMapClick(e, activity.location)}
              >
                Map
              </Button>
              <Button
                size="sm"
                variant="flat"
                className="h-6 text-xs px-2"
                startContent={<i className="fas fa-directions text-xs" />}
                onClick={(e) => onDirectionsClick(e, activity.location)}
              >
                Directions
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

export default function Itinerary({ onBack }) {
  const { currentItinerary: itinerary, isSaved, saveTrip, weatherForecasts, reorderActivities, updateActivity, deleteActivity, addActivity, replaceDay, replaceActivity } = useTripStore()
  const { activeDay, selectedActivity, mobileDetailOpen, subView, setActiveDay, selectActivity, closeMobileDetail, setSubView } = useUiStore()
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [mapOpen, setMapOpen] = useState(() => window.innerWidth >= 768)
  const [editing, setEditing] = useState(false)
  const [addingActivity, setAddingActivity] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const contentRef = useRef(null)

  // Edit form state
  const [editForm, setEditForm] = useState({})
  const [addForm, setAddForm] = useState({
    name: '', time: '', duration: '', description: '',
    priceAmount: '', priceType: 'free', address: '', type: 'activity',
  })

  const days = itinerary?.days || []
  const currentDay = days[activeDay]
  const totalCost = itinerary?.totalEstimatedCost
  const isShared = itinerary?._shared === true

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleSave = () => {
    setSaving(true)
    saveTrip(itinerary)
    setTimeout(() => setSaving(false), 800)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await generatePDF(itinerary)
    } catch (err) {
      alert('PDF generation error: ' + err.message)
    }
    setExporting(false)
  }

  const handleActivityClick = (activity) => {
    selectActivity(activity)
    setEditing(false)
  }

  const handleStartEdit = () => {
    if (!selectedActivity) return
    setEditForm({
      name: selectedActivity.name || '',
      time: selectedActivity.time || '',
      duration: selectedActivity.duration || '',
      description: selectedActivity.description || '',
      priceAmount: selectedActivity.price?.amount || '',
      priceType: selectedActivity.price?.type || 'free',
      address: selectedActivity.location?.address || '',
    })
    setEditing(true)
  }

  const handleSaveEdit = () => {
    const updates = {
      name: editForm.name,
      time: editForm.time,
      duration: editForm.duration,
      description: editForm.description,
      price: editForm.priceType === 'free'
        ? { type: 'free' }
        : { type: editForm.priceType, amount: parseFloat(editForm.priceAmount) || 0, currency: itinerary?.formData?.currency || '€' },
    }
    if (editForm.address && selectedActivity.location) {
      updates.location = { ...selectedActivity.location, address: editForm.address }
    }
    updateActivity(activeDay, selectedActivity.id, updates)
    setEditing(false)
    const updatedDay = useTripStore.getState().currentItinerary?.days[activeDay]
    const updatedAct = updatedDay?.activities.find(a => a.id === selectedActivity.id)
    if (updatedAct) selectActivity(updatedAct)
  }

  const handleDelete = () => {
    if (window.confirm('Delete this activity?')) {
      deleteActivity(activeDay, selectedActivity.id)
      setEditing(false)
    }
  }

  const handleAddActivity = () => {
    const newActivity = {
      id: `d${activeDay + 1}a${(currentDay?.activities?.length || 0) + 1}`,
      name: addForm.name,
      type: addForm.type,
      time: addForm.time,
      duration: addForm.duration,
      description: addForm.description,
      location: addForm.address ? { address: addForm.address, lat: 0, lng: 0 } : undefined,
      price: addForm.priceType === 'free'
        ? { type: 'free' }
        : { type: addForm.priceType, amount: parseFloat(addForm.priceAmount) || 0, currency: itinerary?.formData?.currency || '€' },
    }
    addActivity(activeDay, newActivity)
    setAddForm({ name: '', time: '', duration: '', description: '', priceAmount: '', priceType: 'free', address: '', type: 'activity' })
    setAddingActivity(false)
  }

  const handleRegenerateDay = async () => {
    setRegenerating(true)
    try {
      const newDay = await regenerateDay(itinerary, activeDay)
      replaceDay(activeDay, newDay)
    } catch (err) {
      alert('Regeneration error: ' + err.message)
    }
    setRegenerating(false)
  }

  const handleRegenerateActivity = async (activity) => {
    setRegenerating(true)
    try {
      const newActivity = await regenerateActivity(itinerary, activity.id)
      replaceActivity(activeDay, activity.id, newActivity)
      closeMobileDetail()
    } catch (err) {
      alert('Regeneration error: ' + err.message)
    }
    setRegenerating(false)
  }

  const handleRegenerateMeals = async () => {
    setRegenerating(true)
    try {
      const newDay = await regenerateMeals(itinerary, activeDay)
      replaceDay(activeDay, newDay)
    } catch (err) {
      alert('Regeneration error: ' + err.message)
    }
    setRegenerating(false)
  }

  const handleOptimizeRoute = async () => {
    setOptimizing(true)
    try {
      const optimizedDay = await optimizeRoute(itinerary, activeDay)
      replaceDay(activeDay, optimizedDay)
    } catch (err) {
      alert('Errore nell\'ottimizzazione: ' + err.message)
    }
    setOptimizing(false)
  }

  const budgetPercent = totalCost?.amount && itinerary?.formData?.budget
    ? Math.min((totalCost.amount / itinerary.formData.budget) * 100, 100)
    : null

  const budgetOver = budgetPercent !== null && budgetPercent > 100

  const activityIds = currentDay?.activities?.map(a => a.id) || []

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-default-200 no-print">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button isIconOnly variant="flat" size="sm" onPress={onBack} aria-label="Back to trips">
            <i className="fas fa-arrow-left" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">{itinerary.title || 'Your Trip'}</h1>
            {itinerary.summary && <p className="text-xs text-default-500 truncate">{itinerary.summary}</p>}
          </div>
          <div className="flex items-center gap-1">
            {!isShared && (
              <Button
                isIconOnly
                variant={isSaved ? 'solid' : 'flat'}
                color={isSaved ? 'primary' : 'default'}
                size="sm"
                onPress={handleSave}
                isLoading={saving}
                aria-label={isSaved ? 'Saved' : 'Save trip'}
              >
                <i className={`fas ${isSaved ? 'fa-bookmark' : 'fa-regular fa-bookmark'}`} />
              </Button>
            )}
            <Dropdown>
              <DropdownTrigger>
                <Button isIconOnly variant="flat" size="sm" isLoading={exporting} aria-label="Export">
                  <i className="fas fa-file-export" />
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Export">
                <DropdownItem key="pdf" startContent={<i className="fas fa-file-pdf" />} onPress={handleExport}>PDF</DropdownItem>
                <DropdownItem key="json" startContent={<i className="fas fa-file-code" />} onPress={() => exportJSON(itinerary)}>JSON</DropdownItem>
                <DropdownItem key="ical" startContent={<i className="fas fa-calendar-alt" />} onPress={() => exportICal(itinerary)}>iCal</DropdownItem>
                <DropdownItem key="md" startContent={<i className="fas fa-file-alt" />} onPress={() => exportMarkdown(itinerary)}>Markdown</DropdownItem>
              </DropdownMenu>
            </Dropdown>
            <Button isIconOnly variant="flat" size="sm" onPress={() => setShowShare(true)} aria-label="Share">
              <i className="fas fa-share-alt" />
            </Button>
            <Button isIconOnly variant="flat" size="sm" onPress={() => handleActivityClick(null)} aria-label="Trip info">
              <i className="fas fa-info-circle" />
            </Button>
          </div>
        </div>
      </div>

      {/* Budget Bar */}
      {budgetPercent !== null && (
        <div className="max-w-6xl mx-auto w-full px-4 py-2 no-print">
          <div className="flex justify-between text-xs text-default-500 mb-1">
            <span>Estimated cost: {totalCost.currency} {totalCost.amount?.toLocaleString()}</span>
            <span>Budget: {itinerary.formData.currency} {itinerary.formData.budget?.toLocaleString()}</span>
          </div>
          <Progress
            value={Math.min(budgetPercent, 100)}
            color={budgetOver ? 'danger' : 'primary'}
            size="sm"
            className="w-full"
          />
          {budgetOver && (
            <p className="text-xs text-danger mt-1">
              <i className="fas fa-exclamation-triangle mr-1" />Over budget by {(budgetPercent - 100).toFixed(0)}%
            </p>
          )}
        </div>
      )}

      {/* Day Tabs */}
      <div className="max-w-6xl mx-auto w-full px-4 no-print">
        <div className="flex gap-1.5 overflow-x-auto py-2 scrollbar-none">
          {days.map((day, i) => {
            const dayWeather = getWeatherForDate(weatherForecasts, day.date)
            return (
              <Button
                key={i}
                size="sm"
                variant={i === activeDay ? 'solid' : 'flat'}
                color={i === activeDay ? 'primary' : 'default'}
                className="flex-shrink-0"
                onPress={() => setActiveDay(i)}
              >
                <span className="font-bold">G{i + 1}</span>
                <span className="hidden sm:inline text-xs opacity-70 max-w-[80px] truncate">{day.theme || `Day ${i + 1}`}</span>
                {dayWeather && <WeatherCompact weather={dayWeather} />}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-4" ref={contentRef}>
        {currentDay ? (
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Left: Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-bold">Day {currentDay.dayNumber}</h2>
                  <p className="text-sm text-default-500">{currentDay.theme}</p>
                  <div className="flex gap-3 mt-1 text-xs text-default-500">
                    {currentDay.date && (
                      <span><i className="fas fa-calendar mr-1" />{new Date(currentDay.date).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                    )}
                    {currentDay.dailyCost && (
                      <span><i className="fas fa-receipt mr-1" />{currentDay.dailyCost.currency} {currentDay.dailyCost.amount}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() => setMapOpen((prev) => !prev)}
                    startContent={<i className="fas fa-map-marked-alt" />}
                  >
                    {mapOpen ? 'Hide' : 'Map'}
                  </Button>
                </div>
              </div>

              {currentDay.overview && (
                <p className="text-sm text-default-600 mb-4 bg-content2 p-3 rounded-lg">{currentDay.overview}</p>
              )}

              {/* AI Actions */}
              {!isShared && subView === 'itinerary' && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button size="sm" variant="flat" color="primary" onPress={handleOptimizeRoute} isDisabled={optimizing} isLoading={optimizing} startContent={!optimizing && <i className="fas fa-route" />}>
                    Ottimizza
                  </Button>
                  <Button size="sm" variant="flat" onPress={handleRegenerateDay} isDisabled={regenerating} isLoading={regenerating} startContent={!regenerating && <i className="fas fa-sync-alt" />}>
                    Rigenera
                  </Button>
                  <Button size="sm" variant="flat" onPress={handleRegenerateMeals} isDisabled={regenerating} startContent={<i className="fas fa-utensils" />}>
                    Ristoranti
                  </Button>
                  {(() => {
                    const dist = calculateRouteDistance(currentDay.activities || [])
                    return dist > 0 ? (
                      <Chip size="sm" variant="flat" startContent={<i className="fas fa-route" />}>
                        {dist} km
                      </Chip>
                    ) : null
                  })()}
                </div>
              )}

              {/* Sub-view Tabs */}
              <Tabs
                selectedKey={subView}
                onSelectionChange={setSubView}
                variant="underlined"
                color="primary"
                className="mb-4"
              >
                <Tab key="itinerary" title={<div className="flex items-center gap-1.5"><i className="fas fa-route" /> Itinerario</div>} />
                <Tab key="budget" title={<div className="flex items-center gap-1.5"><i className="fas fa-wallet" /> Budget</div>} />
                <Tab key="chat" title={<div className="flex items-center gap-1.5"><i className="fas fa-comment-dots" /> Assistente</div>} />
              </Tabs>

              {subView === 'chat' ? (
                <Suspense fallback={<div className="flex items-center justify-center py-10"><i className="fas fa-spinner fa-spin text-xl text-primary" /> <span className="ml-2 text-default-500">Loading assistant...</span></div>}>
                  <ChatAssistant />
                </Suspense>
              ) : subView === 'budget' ? (
                <Suspense fallback={<div className="flex items-center justify-center py-10"><i className="fas fa-spinner fa-spin text-xl text-primary" /> <span className="ml-2 text-default-500">Loading budget...</span></div>}>
                  <BudgetTracker currentDay={currentDay} isShared={isShared} />
                </Suspense>
              ) : (
                <>
                  <WeatherExpanded weather={getWeatherForDate(weatherForecasts, currentDay.date)} />

                  {mapOpen && (
                    <div className="mb-4 rounded-xl overflow-hidden border border-default-200">
                      <Suspense fallback={<div className="flex items-center justify-center py-10"><i className="fas fa-spinner fa-spin text-xl text-primary" /></div>}>
                        <MapView />
                      </Suspense>
                    </div>
                  )}

                  {/* Timeline with DnD */}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => {
                      const { active, over } = event
                      if (active.id !== over?.id) {
                        const oldIndex = currentDay.activities.findIndex(a => a.id === active.id)
                        const newIndex = currentDay.activities.findIndex(a => a.id === over.id)
                        reorderActivities(activeDay, oldIndex, newIndex)
                      }
                    }}
                  >
                    <SortableContext items={activityIds} strategy={verticalListSortingStrategy}>
                      <div className="space-y-0">
                        {currentDay.activities?.map((activity, idx) => {
                          const config = getTypeConfig(activity.type)
                          const isSelected = selectedActivity?.id === activity.id
                          return (
                            <SortableActivityCard
                              key={activity.id}
                              activity={activity}
                              idx={idx}
                              config={config}
                              isSelected={isSelected}
                              onActivityClick={handleActivityClick}
                              onMapClick={(e, loc) => { e.stopPropagation(); openInMaps(loc) }}
                              onDirectionsClick={(e, loc) => { e.stopPropagation(); openDirections(loc) }}
                              isLast={idx === currentDay.activities.length - 1}
                              isShared={isShared}
                            />
                          )
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {/* Add Activity */}
                  {isShared ? null : !addingActivity ? (
                    <Button
                      variant="bordered"
                      className="w-full mt-3 border-dashed"
                      startContent={<i className="fas fa-plus" />}
                      onPress={() => setAddingActivity(true)}
                    >
                      Aggiungi attività
                    </Button>
                  ) : (
                    <Card className="mt-3 border border-default-200">
                      <CardBody className="gap-3">
                        <h4 className="font-semibold text-sm">New activity</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <Input label="Nome" value={addForm.name} onValueChange={(v) => setAddForm(f => ({ ...f, name: v }))} placeholder="Activity name" size="sm" variant="bordered" />
                          <Select
                            label="Type"
                            selectedKeys={[addForm.type]}
                            onSelectionChange={(keys) => setAddForm(f => ({ ...f, type: Array.from(keys)[0] }))}
                            size="sm"
                            variant="bordered"
                          >
                            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                              <SelectItem key={key}>{cfg.icon} {cfg.label}</SelectItem>
                            ))}
                          </Select>
                          <Input label="Time" value={addForm.time} onValueChange={(v) => setAddForm(f => ({ ...f, time: v }))} placeholder="e.g. 10:00" size="sm" variant="bordered" />
                          <Input label="Duration" value={addForm.duration} onValueChange={(v) => setAddForm(f => ({ ...f, duration: v }))} placeholder="e.g. 2h" size="sm" variant="bordered" />
                        </div>
                        <Input label="Description" value={addForm.description} onValueChange={(v) => setAddForm(f => ({ ...f, description: v }))} placeholder="Optional description" size="sm" variant="bordered" />
                        <div className="grid grid-cols-2 gap-3">
                          <Input type="number" label="Price" value={addForm.priceAmount} onValueChange={(v) => setAddForm(f => ({ ...f, priceAmount: v }))} placeholder="0" min="0" step="0.01" size="sm" variant="bordered" />
                          <Select
                            label="Price type"
                            selectedKeys={[addForm.priceType]}
                            onSelectionChange={(keys) => setAddForm(f => ({ ...f, priceType: Array.from(keys)[0] }))}
                            size="sm"
                            variant="bordered"
                          >
                            <SelectItem key="free">Free</SelectItem>
                            <SelectItem key="total">Total</SelectItem>
                            <SelectItem key="per person">Per person</SelectItem>
                          </Select>
                        </div>
                        <Input label="Address" value={addForm.address} onValueChange={(v) => setAddForm(f => ({ ...f, address: v }))} placeholder="Optional address" size="sm" variant="bordered" />
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="flat" onPress={() => setAddingActivity(false)}>Cancel</Button>
                          <Button size="sm" color="primary" onPress={handleAddActivity} isDisabled={!addForm.name.trim()} startContent={<i className="fas fa-check" />}>Add</Button>
                        </div>
                      </CardBody>
                    </Card>
                  )}
                </>
              )}
            </div>

            {/* Right: Detail Panel (Desktop) */}
            {selectedActivity && (
              <div className="hidden lg:block w-[360px] flex-shrink-0">
                <Card className="sticky top-20 border border-default-200 shadow-md max-h-[calc(100vh-100px)] overflow-y-auto scrollbar-thin">
                  <CardBody className="gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {editing ? 'Edit activity' : selectedActivity.name}
                        </h3>
                      </div>
                      <Button isIconOnly size="sm" variant="light" onPress={closeMobileDetail}>
                        <i className="fas fa-times" />
                      </Button>
                    </div>

                    {editing ? (
                      <div className="space-y-3">
                        <Input label="Nome" value={editForm.name} onValueChange={(v) => setEditForm(f => ({ ...f, name: v }))} size="sm" variant="bordered" />
                        <div className="grid grid-cols-2 gap-3">
                          <Input label="Time" value={editForm.time} onValueChange={(v) => setEditForm(f => ({ ...f, time: v }))} size="sm" variant="bordered" />
                          <Input label="Duration" value={editForm.duration} onValueChange={(v) => setEditForm(f => ({ ...f, duration: v }))} size="sm" variant="bordered" />
                        </div>
                        <Textarea label="Description" value={editForm.description} onValueChange={(v) => setEditForm(f => ({ ...f, description: v }))} size="sm" variant="bordered" minRows={2} />
                        <div className="grid grid-cols-2 gap-3">
                          <Input type="number" label="Price" value={editForm.priceAmount} onValueChange={(v) => setEditForm(f => ({ ...f, priceAmount: v }))} min="0" step="0.01" size="sm" variant="bordered" />
                          <Select
                            label="Price type"
                            selectedKeys={[editForm.priceType]}
                            onSelectionChange={(keys) => setEditForm(f => ({ ...f, priceType: Array.from(keys)[0] }))}
                            size="sm"
                            variant="bordered"
                          >
                            <SelectItem key="free">Free</SelectItem>
                            <SelectItem key="total">Total</SelectItem>
                            <SelectItem key="per person">Per person</SelectItem>
                          </Select>
                        </div>
                        <Input label="Address" value={editForm.address} onValueChange={(v) => setEditForm(f => ({ ...f, address: v }))} size="sm" variant="bordered" />
                        <div className="flex gap-2">
                          <Button size="sm" color="primary" onPress={handleSaveEdit} startContent={<i className="fas fa-check" />}>Save</Button>
                          <Button size="sm" variant="flat" onPress={() => setEditing(false)}>Cancel</Button>
                          {!isShared && (
                            <Button size="sm" color="danger" variant="flat" onPress={handleDelete} startContent={<i className="fas fa-trash-alt" />}>Delete</Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        {(() => {
                          const config = getTypeConfig(selectedActivity.type)
                          return (
                            <Chip
                              size="sm"
                              variant="flat"
                              style={{ background: config.color + '15', color: config.color }}
                            >
                              {config.icon} {config.label}
                              {selectedActivity.mealType && ` • ${selectedActivity.mealType}`}
                            </Chip>
                          )
                        })()}

                        {selectedActivity.description && (
                          <p className="text-sm text-default-600">{selectedActivity.description}</p>
                        )}

                        <div className="space-y-2">
                          {selectedActivity.time && (
                            <div className="flex items-center gap-2 text-sm">
                              <i className="fas fa-clock text-default-400 w-4 text-center" />
                              <span className="text-default-500"></span>
                              <span className="font-medium">{selectedActivity.time}{selectedActivity.duration ? ` (${selectedActivity.duration})` : ''}</span>
                            </div>
                          )}
                          {selectedActivity.hours && (
                            <div className="flex items-center gap-2 text-sm">
                              <i className="fas fa-store text-default-400 w-4 text-center" />
                              <span className="text-default-500"></span>
                              <span className="font-medium">{selectedActivity.hours}</span>
                            </div>
                          )}
                          {selectedActivity.price && (
                            <div className="flex items-center gap-2 text-sm">
                              <i className="fas fa-tag text-default-400 w-4 text-center" />
                              <span className="text-default-500">Price:</span>
                              <span className="font-medium">{formatPrice(selectedActivity.price)}</span>
                            </div>
                          )}
                          {selectedActivity.rating && (
                            <div className="flex items-center gap-2 text-sm">
                              <i className="fas fa-star text-amber-400 w-4 text-center" />
                              <span className="font-medium">{selectedActivity.rating}/5 {formatRating(selectedActivity.rating)}</span>
                              {selectedActivity.reviews && <span className="text-default-400">({selectedActivity.reviews?.toLocaleString()} reviews)</span>}
                            </div>
                          )}
                          {selectedActivity.cuisine && (
                            <div className="flex items-center gap-2 text-sm">
                              <i className="fas fa-utensils text-default-400 w-4 text-center" />
                              <span className="text-default-500">Cuisine:</span>
                              <span className="font-medium">{selectedActivity.cuisine}</span>
                            </div>
                          )}
                          {selectedActivity.location?.address && (
                            <div className="flex items-center gap-2 text-sm">
                              <i className="fas fa-map-pin text-default-400 w-4 text-center" />
                              <span className="font-medium">{selectedActivity.location.address}</span>
                            </div>
                          )}
                          {selectedActivity.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <i className="fas fa-phone text-default-400 w-4 text-center" />
                              <a className="font-medium text-primary hover:underline" href={`tel:${selectedActivity.phone}`}>{selectedActivity.phone}</a>
                            </div>
                          )}
                          {selectedActivity.website && (
                            <div className="flex items-center gap-2 text-sm">
                              <i className="fas fa-globe text-default-400 w-4 text-center" />
                              <a className="font-medium text-primary hover:underline truncate" href={selectedActivity.website} target="_blank" rel="noopener noreferrer">
                                {selectedActivity.website.replace(/^https?:\/\//, '').slice(0, 30)}
                              </a>
                            </div>
                          )}
                        </div>

                        {selectedActivity.tips?.length > 0 && (
                          <div className="bg-content2 p-3 rounded-lg">
                            <h4 className="text-sm font-semibold mb-2"><i className="fas fa-lightbulb text-amber-400 mr-1" /> Consigli</h4>
                            <ul className="space-y-1">
                              {selectedActivity.tips.map((tip, i) => (
                                <li key={i} className="text-sm text-default-600">{tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 pt-2 border-t border-default-200">
                          {!isShared && (
                            <Button size="sm" variant="flat" onPress={handleStartEdit} startContent={<i className="fas fa-edit" />}>Edit</Button>
                          )}
                          {!isShared && (
                            <Button size="sm" variant="flat" onPress={() => handleRegenerateActivity(selectedActivity)} isDisabled={regenerating} isLoading={regenerating} startContent={!regenerating && <i className="fas fa-sync-alt" />}>Regenerate</Button>
                          )}
                          <Button size="sm" color="primary" variant="flat" onPress={() => openInMaps(selectedActivity.location)} startContent={<i className="fas fa-map-marker-alt" />}>Maps</Button>
                          <Button size="sm" variant="flat" onPress={() => openDirections(selectedActivity.location)} startContent={<i className="fas fa-directions" />}>Directions</Button>
                          {selectedActivity.phone && (
                            <Button size="sm" variant="flat" as="a" href={`tel:${selectedActivity.phone}`} startContent={<i className="fas fa-phone" />}>Call</Button>
                          )}
                          {selectedActivity.website && (
                            <Button size="sm" variant="flat" as="a" href={selectedActivity.website} target="_blank" rel="noopener noreferrer" startContent={<i className="fas fa-globe" />}>Website</Button>
                          )}
                        </div>
                      </>
                    )}
                  </CardBody>
                </Card>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-20">
            <p className="text-default-500">Select a day to see activities</p>
          </div>
        )}
      </div>

      {/* Mobile Detail Overlay */}
      {mobileDetailOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeMobileDetail} />
          <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl max-h-[85vh] overflow-y-auto animate-fade-slide-in shadow-2xl">
            {/* Trip Info Panel */}
            {selectedActivity === null ? (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Trip Info</h3>
                  <Button isIconOnly size="sm" variant="light" onPress={closeMobileDetail}>
                    <i className="fas fa-times" />
                  </Button>
                </div>
                <p className="text-sm text-default-600 mb-4">{itinerary.summary}</p>
                {totalCost && (
                  <div className="flex items-center gap-2 text-sm mb-4">
                    <i className="fas fa-receipt text-primary/60" />
                    <span className="text-default-500">Estimated cost:</span>
                    <span className="font-semibold">{totalCost.currency} {totalCost.amount?.toLocaleString()}</span>
                  </div>
                )}
                {itinerary.tips?.length > 0 && (
                  <div className="bg-content2 p-3 rounded-lg mb-4">
                    <h4 className="text-sm font-semibold mb-2"><i className="fas fa-lightbulb text-amber-400 mr-1" /> Consigli di Viaggio</h4>
                    <ul className="space-y-1">
                      {itinerary.tips.map((tip, i) => <li key={i} className="text-sm text-default-600">{tip}</li>)}
                    </ul>
                  </div>
                )}
                <PackingList />
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold truncate pr-2">{editing ? 'Edit' : selectedActivity.name}</h3>
                  <Button isIconOnly size="sm" variant="light" onPress={closeMobileDetail}>
                    <i className="fas fa-times" />
                  </Button>
                </div>
                {/* Same detail content as desktop but in mobile layout */}
                {!editing && (() => {
                  const config = getTypeConfig(selectedActivity.type)
                  return (
                    <Chip size="sm" variant="flat" style={{ background: config.color + '15', color: config.color }}>
                      {config.icon} {config.label}
                      {selectedActivity.mealType && ` • ${selectedActivity.mealType}`}
                    </Chip>
                  )
                })()}
                {editing ? (
                  <div className="space-y-3 mt-3">
                    <Input label="Nome" value={editForm.name} onValueChange={(v) => setEditForm(f => ({ ...f, name: v }))} size="sm" variant="bordered" />
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Time" value={editForm.time} onValueChange={(v) => setEditForm(f => ({ ...f, time: v }))} size="sm" variant="bordered" />
                      <Input label="Duration" value={editForm.duration} onValueChange={(v) => setEditForm(f => ({ ...f, duration: v }))} size="sm" variant="bordered" />
                    </div>
                    <Textarea label="Description" value={editForm.description} onValueChange={(v) => setEditForm(f => ({ ...f, description: v }))} size="sm" variant="bordered" minRows={2} />
                    <div className="grid grid-cols-2 gap-3">
                      <Input type="number" label="Price" value={editForm.priceAmount} onValueChange={(v) => setEditForm(f => ({ ...f, priceAmount: v }))} min="0" step="0.01" size="sm" variant="bordered" />
                      <Select label="Price type" selectedKeys={[editForm.priceType]} onSelectionChange={(keys) => setEditForm(f => ({ ...f, priceType: Array.from(keys)[0] }))} size="sm" variant="bordered">
                        <SelectItem key="free">Free</SelectItem>
                        <SelectItem key="total">Total</SelectItem>
                        <SelectItem key="per person">Per person</SelectItem>
                      </Select>
                    </div>
                    <Input label="Address" value={editForm.address} onValueChange={(v) => setEditForm(f => ({ ...f, address: v }))} size="sm" variant="bordered" />
                    <div className="flex gap-2">
                      <Button size="sm" color="primary" onPress={handleSaveEdit} startContent={<i className="fas fa-check" />}>Save</Button>
                      <Button size="sm" variant="flat" onPress={() => setEditing(false)}>Cancel</Button>
                      {!isShared && <Button size="sm" color="danger" variant="flat" onPress={handleDelete} startContent={<i className="fas fa-trash-alt" />}>Delete</Button>}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {selectedActivity.description && <p className="text-sm text-default-600">{selectedActivity.description}</p>}
                    {selectedActivity.time && <div className="flex items-center gap-2 text-sm"><i className="fas fa-clock text-default-400 w-4 text-center" /><span className="font-medium">{selectedActivity.time}{selectedActivity.duration ? ` (${selectedActivity.duration})` : ''}</span></div>}
                    {selectedActivity.price && <div className="flex items-center gap-2 text-sm"><i className="fas fa-tag text-default-400 w-4 text-center" /><span className="font-medium">{formatPrice(selectedActivity.price)}</span></div>}
                    {selectedActivity.rating && <div className="flex items-center gap-2 text-sm"><i className="fas fa-star text-amber-400 w-4 text-center" /><span className="font-medium">{selectedActivity.rating}/5</span></div>}
                    {selectedActivity.cuisine && <div className="flex items-center gap-2 text-sm"><i className="fas fa-utensils text-default-400 w-4 text-center" /><span className="font-medium">{selectedActivity.cuisine}</span></div>}
                    {selectedActivity.location?.address && <div className="flex items-center gap-2 text-sm"><i className="fas fa-map-pin text-default-400 w-4 text-center" /><span className="font-medium">{selectedActivity.location.address}</span></div>}

                    {selectedActivity.tips?.length > 0 && (
                      <div className="bg-content2 p-3 rounded-lg">
                        <h4 className="text-sm font-semibold mb-2"><i className="fas fa-lightbulb text-amber-400 mr-1" /> Consigli</h4>
                        <ul className="space-y-1">{selectedActivity.tips.map((tip, i) => <li key={i} className="text-sm text-default-600">{tip}</li>)}</ul>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-default-200">
                      {!isShared && <Button size="sm" variant="flat" onPress={handleStartEdit} startContent={<i className="fas fa-edit" />}>Edit</Button>}
                      {!isShared && <Button size="sm" variant="flat" onPress={() => handleRegenerateActivity(selectedActivity)} isDisabled={regenerating} startContent={<i className="fas fa-sync-alt" />}>Regenerate</Button>}
                      <Button size="sm" color="primary" variant="flat" onPress={() => openInMaps(selectedActivity.location)} startContent={<i className="fas fa-map-marker-alt" />}>Maps</Button>
                      <Button size="sm" variant="flat" onPress={() => openDirections(selectedActivity.location)} startContent={<i className="fas fa-directions" />}>Directions</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShare && (
        <ShareModal trip={itinerary} onClose={() => setShowShare(false)} />
      )}
    </div>
  )
}
