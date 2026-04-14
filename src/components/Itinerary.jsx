import { useState, useRef, useEffect, lazy, Suspense } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
  attraction: { icon: '🏛️', color: '#3d85c6', label: 'Attrazione' },
  restaurant: { icon: '🍽️', color: '#e07a5f', label: 'Ristorante' },
  transport: { icon: '🚗', color: '#636e72', label: 'Trasporto' },
  activity: { icon: '🎯', color: '#81b29a', label: 'Attività' },
  accommodation: { icon: '🏨', color: '#6c5ce7', label: 'Alloggio' },
}

function getTypeConfig(type) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.activity
}

function formatPrice(price) {
  if (!price) return ''
  if (price.type === 'free') return 'Gratis'
  const amt = price.amount ? `${price.currency || ''} ${price.amount}` : ''
  const suffix = price.type === 'per person' ? '/persona' : ''
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
    <div ref={setNodeRef} style={style} className="timeline-item">
      <div className="timeline-line" style={{ '--line-color': config.color }}>
        <div className="timeline-dot" style={{ background: config.color }}>
          <span className="timeline-dot-icon">{config.icon}</span>
        </div>
        {isDragging ? null : isLast ? null : <div className="timeline-connector" />}
      </div>
      <div className="sortable-activity-wrapper">
        {!isShared && (
          <button className="drag-handle" {...attributes} {...listeners} title="Trascina per riordinare">
            <i className="fas fa-grip-vertical"></i>
          </button>
        )}
        <div
          className={`activity-card ${isSelected ? 'selected' : ''}`}
          onClick={() => onActivityClick(activity)}
        >
          <div className="activity-card-header">
            <span className="activity-time">{activity.time}</span>
            <span className="activity-type-badge" style={{ background: config.color + '18', color: config.color }}>
              {config.icon} {config.label}
            </span>
          </div>
          <h3 className="activity-name">{activity.name}</h3>
          <div className="activity-meta">
            {activity.duration && <span><i className="fas fa-clock"></i> {activity.duration}</span>}
            {activity.price && <span><i className="fas fa-tag"></i> {formatPrice(activity.price)}</span>}
            {activity.rating && <span className="activity-rating">★ {activity.rating}</span>}
          </div>
          {activity.cuisine && <span className="activity-cuisine"><i className="fas fa-utensils"></i> {activity.cuisine}</span>}
          {activity.description && (
            <p className="activity-desc">{activity.description}</p>
          )}
          <div className="activity-quick-actions">
            <button
              className="btn-map"
              onClick={(e) => onMapClick(e, activity.location)}
              title="Apri in Maps"
            >
              <i className="fas fa-map-marker-alt"></i> Mappa
            </button>
            <button
              className="btn-directions"
              onClick={(e) => onDirectionsClick(e, activity.location)}
              title="Indicazioni"
            >
              <i className="fas fa-directions"></i> Indicazioni
            </button>
          </div>
        </div>
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
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const contentRef = useRef(null)
  const exportMenuRef = useRef(null)

  // Close export menu when clicking outside
  useEffect(() => {
    if (!showExportMenu) return
    const handleClick = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showExportMenu])

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
      alert('Errore nella generazione PDF: ' + err.message)
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
    // Re-select the updated activity
    const updatedDay = useTripStore.getState().currentItinerary?.days[activeDay]
    const updatedAct = updatedDay?.activities.find(a => a.id === selectedActivity.id)
    if (updatedAct) selectActivity(updatedAct)
  }

  const handleDelete = () => {
    if (window.confirm('Eliminare questa attività?')) {
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
      alert('Errore nella rigenerazione: ' + err.message)
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
      alert('Errore nella rigenerazione: ' + err.message)
    }
    setRegenerating(false)
  }

  const handleRegenerateMeals = async () => {
    setRegenerating(true)
    try {
      const newDay = await regenerateMeals(itinerary, activeDay)
      replaceDay(activeDay, newDay)
    } catch (err) {
      alert('Errore nella rigenerazione: ' + err.message)
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
    <div className="itinerary-container">
      {/* Top Bar */}
      <div className="itinerary-topbar">
        <button className="btn-icon" onClick={onBack} title="Torna ai viaggi">
          <i className="fas fa-arrow-left"></i>
        </button>
        <div className="itinerary-title-group">
          <h1 className="itinerary-title">{itinerary.title || 'Il Tuo Viaggio'}</h1>
          {itinerary.summary && <p className="itinerary-summary">{itinerary.summary}</p>}
        </div>
        <div className="itinerary-actions">
          {!isShared && (
            <button
              className={`btn-icon ${isSaved ? 'saved' : ''}`}
              onClick={handleSave}
              title={isSaved ? 'Salvato' : 'Salva viaggio'}
              disabled={saving}
            >
              <i className={`fas ${saving ? 'fa-spinner fa-spin' : isSaved ? 'fa-bookmark' : 'fa-regular fa-bookmark'}`}></i>
            </button>
          )}
          <div className="export-menu-wrapper" ref={exportMenuRef}>
            <button className="btn-icon" onClick={() => setShowExportMenu(!showExportMenu)} title="Esporta" disabled={exporting}>
              <i className={`fas ${exporting ? 'fa-spinner fa-spin' : 'fa-file-export'}`}></i>
            </button>
            {showExportMenu && (
              <div className="export-menu">
                <button onClick={() => { handleExport(); setShowExportMenu(false) }}>
                  <i className="fas fa-file-pdf"></i> PDF
                </button>
                <button onClick={() => { exportJSON(itinerary); setShowExportMenu(false) }}>
                  <i className="fas fa-file-code"></i> JSON
                </button>
                <button onClick={() => { exportICal(itinerary); setShowExportMenu(false) }}>
                  <i className="fas fa-calendar-alt"></i> iCal
                </button>
                <button onClick={() => { exportMarkdown(itinerary); setShowExportMenu(false) }}>
                  <i className="fas fa-file-alt"></i> Markdown
                </button>
              </div>
            )}
          </div>
          <button className="btn-icon" onClick={() => setShowShare(true)} title="Condividi">
            <i className="fas fa-share-alt"></i>
          </button>
          <button className="btn-icon" onClick={() => handleActivityClick(null)} title="Informazioni viaggio">
            <i className="fas fa-info-circle"></i>
          </button>
        </div>
      </div>

      {/* Budget Bar */}
      {budgetPercent !== null && (
        <div className="budget-bar-container">
          <div className="budget-bar-labels">
            <span>Spesa stimata: {totalCost.currency} {totalCost.amount?.toLocaleString()}</span>
            <span>Budget: {itinerary.formData.currency} {itinerary.formData.budget?.toLocaleString()}</span>
          </div>
          <div className="budget-bar">
            <div
              className={`budget-bar-fill ${budgetOver ? 'over' : ''}`}
              style={{ width: `${Math.min(budgetPercent, 100)}%` }}
            />
          </div>
          {budgetOver && <p className="budget-warning"><i className="fas fa-exclamation-triangle"></i> Supera il budget del {(budgetPercent - 100).toFixed(0)}%</p>}
        </div>
      )}

      {/* Day Tabs */}
      <div className="day-tabs">
        <div className="day-tabs-scroll">
          {days.map((day, i) => {
            const dayWeather = getWeatherForDate(weatherForecasts, day.date)
            return (
              <button
                key={i}
                className={`day-tab ${i === activeDay ? 'active' : ''}`}
                onClick={() => setActiveDay(i)}
              >
                <span className="day-tab-num">G{i + 1}</span>
                <span className="day-tab-theme">{day.theme || `Giorno ${i + 1}`}</span>
                <WeatherCompact weather={dayWeather} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Day Content */}
      <div className="itinerary-content" ref={contentRef}>
        {currentDay ? (
          <div className="day-content">
            <div className="day-header">
              <div>
                <h2>Giorno {currentDay.dayNumber}</h2>
                <p className="day-theme">{currentDay.theme}</p>
              </div>
              <div className="day-header-actions">
                <button
                  className="map-toggle-btn"
                  onClick={() => setMapOpen((prev) => !prev)}
                  title={mapOpen ? 'Nascondi mappa' : 'Mostra mappa'}
                >
                  <i className={`fas fa-map-marked-alt`}></i>
                  <span>{mapOpen ? 'Nascondi mappa' : 'Mappa'}</span>
                </button>
                <div className="day-meta">
                  {currentDay.date && <span><i className="fas fa-calendar"></i> {new Date(currentDay.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</span>}
                  {currentDay.dailyCost && <span><i className="fas fa-receipt"></i> {currentDay.dailyCost.currency} {currentDay.dailyCost.amount}</span>}
                </div>
              </div>
            </div>
            {currentDay.overview && <p className="day-overview">{currentDay.overview}</p>}

            {/* AI Actions Row */}
            {!isShared && subView === 'itinerary' && (
              <div className="day-actions">
                <button className="btn-secondary btn-sm" onClick={handleOptimizeRoute} disabled={optimizing}>
                  <i className={`fas ${optimizing ? 'fa-spinner fa-spin' : 'fa-route'}`}></i> Ottimizza percorso
                </button>
                <button className="btn-secondary btn-sm" onClick={handleRegenerateDay} disabled={regenerating}>
                  <i className={`fas ${regenerating ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i> Rigenera giorno
                </button>
                <button className="btn-secondary btn-sm" onClick={handleRegenerateMeals} disabled={regenerating}>
                  <i className="fas fa-utensils"></i> Ristoranti diversi
                </button>
                {(() => {
                  const dist = calculateRouteDistance(currentDay.activities || [])
                  return dist > 0 ? <span className="day-meta-route"><i className="fas fa-route"></i> {dist} km</span> : null
                })()}
              </div>
            )}

            {/* Sub-view Tabs: Itinerario | Budget | Assistente */}
            <div className="day-view-tabs">
              <button
                className={`day-view-tab ${subView === 'itinerary' ? 'active' : ''}`}
                onClick={() => setSubView('itinerary')}
              >
                <i className="fas fa-route"></i> Itinerario
              </button>
              <button
                className={`day-view-tab ${subView === 'budget' ? 'active' : ''}`}
                onClick={() => setSubView('budget')}
              >
                <i className="fas fa-wallet"></i> Budget
              </button>
              <button
                className={`day-view-tab ${subView === 'chat' ? 'active' : ''}`}
                onClick={() => setSubView('chat')}
              >
                <i className="fas fa-comment-dots"></i> Assistente
              </button>
            </div>

            {subView === 'chat' ? (
              <Suspense fallback={<div className="chat-loading"><i className="fas fa-spinner fa-spin"></i> Caricamento assistente...</div>}>
                <ChatAssistant />
              </Suspense>
            ) : subView === 'budget' ? (
              <Suspense fallback={<div className="map-loading"><i className="fas fa-spinner fa-spin"></i> Caricamento budget...</div>}>
                <BudgetTracker currentDay={currentDay} isShared={isShared} />
              </Suspense>
            ) : (
              <>
                {/* Weather */}
                <WeatherExpanded weather={getWeatherForDate(weatherForecasts, currentDay.date)} />

                {/* Map */}
                {mapOpen && (
                  <div className="map-wrapper">
                    <Suspense fallback={<div className="map-loading"><i className="fas fa-spinner fa-spin"></i> Caricamento mappa...</div>}>
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
                    <div className="timeline">
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

                {/* Add Activity Button */}
                {isShared ? null : !addingActivity ? (
                  <button className="btn-add-activity" onClick={() => setAddingActivity(true)}>
                    <i className="fas fa-plus"></i> Aggiungi attività
                  </button>
                ) : (
                  <div className="add-activity-form">
                    <h4>Nuova attività</h4>
                    <div className="edit-form">
                      <div className="edit-form-row">
                        <div className="edit-form-group">
                          <label className="edit-form-label">Nome</label>
                          <input className="edit-form-input" value={addForm.name} onChange={(e) => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome attività" />
                        </div>
                        <div className="edit-form-group">
                          <label className="edit-form-label">Tipo</label>
                          <select className="edit-form-input" value={addForm.type} onChange={(e) => setAddForm(f => ({ ...f, type: e.target.value }))}>
                            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                              <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="edit-form-row">
                        <div className="edit-form-group">
                          <label className="edit-form-label">Orario</label>
                          <input className="edit-form-input" value={addForm.time} onChange={(e) => setAddForm(f => ({ ...f, time: e.target.value }))} placeholder="Es: 10:00" />
                        </div>
                        <div className="edit-form-group">
                          <label className="edit-form-label">Durata</label>
                          <input className="edit-form-input" value={addForm.duration} onChange={(e) => setAddForm(f => ({ ...f, duration: e.target.value }))} placeholder="Es: 2h" />
                        </div>
                      </div>
                      <div className="edit-form-group">
                        <label className="edit-form-label">Descrizione</label>
                        <input className="edit-form-input" value={addForm.description} onChange={(e) => setAddForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrizione (opzionale)" />
                      </div>
                      <div className="edit-form-row">
                        <div className="edit-form-group">
                          <label className="edit-form-label">Prezzo</label>
                          <input className="edit-form-input" type="number" value={addForm.priceAmount} onChange={(e) => setAddForm(f => ({ ...f, priceAmount: e.target.value }))} placeholder="0" min="0" step="0.01" />
                        </div>
                        <div className="edit-form-group">
                          <label className="edit-form-label">Tipo prezzo</label>
                          <select className="edit-form-input" value={addForm.priceType} onChange={(e) => setAddForm(f => ({ ...f, priceType: e.target.value }))}>
                            <option value="free">Gratis</option>
                            <option value="total">Totale</option>
                            <option value="per person">Per persona</option>
                          </select>
                        </div>
                      </div>
                      <div className="edit-form-group">
                        <label className="edit-form-label">Indirizzo</label>
                        <input className="edit-form-input" value={addForm.address} onChange={(e) => setAddForm(f => ({ ...f, address: e.target.value }))} placeholder="Indirizzo (opzionale)" />
                      </div>
                      <div className="edit-form-actions">
                        <button className="btn-primary" onClick={handleAddActivity} disabled={!addForm.name.trim()}>
                          <i className="fas fa-check"></i> Aggiungi
                        </button>
                        <button className="btn-secondary" onClick={() => setAddingActivity(false)}>
                          Annulla
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="empty-day">
            <p>Seleziona un giorno per vedere le attività</p>
          </div>
        )}
      </div>

      {/* Detail Panel - Desktop */}
      {selectedActivity && (
        <div className={`detail-panel ${mobileDetailOpen ? 'mobile-open' : ''}`}>
          <div className="detail-panel-header">
            <h3>{editing ? 'Modifica attività' : selectedActivity.name}</h3>
            <button className="btn-icon" onClick={closeMobileDetail}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="detail-panel-body">
            {editing ? (
              /* Edit Form */
              <div className="edit-form">
                <div className="edit-form-group">
                  <label className="edit-form-label">Nome</label>
                  <input className="edit-form-input" value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="edit-form-row">
                  <div className="edit-form-group">
                    <label className="edit-form-label">Orario</label>
                    <input className="edit-form-input" value={editForm.time} onChange={(e) => setEditForm(f => ({ ...f, time: e.target.value }))} />
                  </div>
                  <div className="edit-form-group">
                    <label className="edit-form-label">Durata</label>
                    <input className="edit-form-input" value={editForm.duration} onChange={(e) => setEditForm(f => ({ ...f, duration: e.target.value }))} />
                  </div>
                </div>
                <div className="edit-form-group">
                  <label className="edit-form-label">Descrizione</label>
                  <textarea className="edit-form-input" rows={3} value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="edit-form-row">
                  <div className="edit-form-group">
                    <label className="edit-form-label">Prezzo</label>
                    <input className="edit-form-input" type="number" value={editForm.priceAmount} onChange={(e) => setEditForm(f => ({ ...f, priceAmount: e.target.value }))} min="0" step="0.01" />
                  </div>
                  <div className="edit-form-group">
                    <label className="edit-form-label">Tipo prezzo</label>
                    <select className="edit-form-input" value={editForm.priceType} onChange={(e) => setEditForm(f => ({ ...f, priceType: e.target.value }))}>
                      <option value="free">Gratis</option>
                      <option value="total">Totale</option>
                      <option value="per person">Per persona</option>
                    </select>
                  </div>
                </div>
                <div className="edit-form-group">
                  <label className="edit-form-label">Indirizzo</label>
                  <input className="edit-form-input" value={editForm.address} onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="edit-form-actions">
                  <button className="btn-primary" onClick={handleSaveEdit}>
                    <i className="fas fa-check"></i> Salva
                  </button>
                  <button className="btn-secondary" onClick={() => setEditing(false)}>
                    Annulla
                  </button>
                  {!isShared && (
                    <button className="btn-danger-outline" onClick={handleDelete}>
                      <i className="fas fa-trash-alt"></i> Elimina
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Normal Detail View */
              <>
                {(() => {
                  const config = getTypeConfig(selectedActivity.type)
                  return (
                    <span className="detail-type" style={{ background: config.color + '18', color: config.color }}>
                      {config.icon} {config.label}
                      {selectedActivity.mealType && ` • ${selectedActivity.mealType}`}
                    </span>
                  )
                })()}

                {selectedActivity.description && (
                  <p className="detail-description">{selectedActivity.description}</p>
                )}

                <div className="detail-info-grid">
                  {selectedActivity.time && (
                    <div className="detail-info-item">
                      <i className="fas fa-clock"></i>
                      <div>
                        <span className="detail-info-label">Orario</span>
                        <span className="detail-info-value">{selectedActivity.time}{selectedActivity.duration ? ` (${selectedActivity.duration})` : ''}</span>
                      </div>
                    </div>
                  )}

                  {selectedActivity.hours && (
                    <div className="detail-info-item">
                      <i className="fas fa-store"></i>
                      <div>
                        <span className="detail-info-label">Orari di apertura</span>
                        <span className="detail-info-value">{selectedActivity.hours}</span>
                      </div>
                    </div>
                  )}

                  {selectedActivity.price && (
                    <div className="detail-info-item">
                      <i className="fas fa-tag"></i>
                      <div>
                        <span className="detail-info-label">Prezzo</span>
                        <span className="detail-info-value">{formatPrice(selectedActivity.price)}</span>
                      </div>
                    </div>
                  )}

                  {selectedActivity.rating && (
                    <div className="detail-info-item">
                      <i className="fas fa-star"></i>
                      <div>
                        <span className="detail-info-label">Valutazione</span>
                        <span className="detail-info-value">
                          {selectedActivity.rating}/5 {formatRating(selectedActivity.rating)}
                          {selectedActivity.reviews && <span className="detail-reviews">({selectedActivity.reviews?.toLocaleString()} recensioni)</span>}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedActivity.cuisine && (
                    <div className="detail-info-item">
                      <i className="fas fa-utensils"></i>
                      <div>
                        <span className="detail-info-label">Cucina</span>
                        <span className="detail-info-value">{selectedActivity.cuisine}</span>
                      </div>
                    </div>
                  )}

                  {selectedActivity.location?.address && (
                    <div className="detail-info-item">
                      <i className="fas fa-map-pin"></i>
                      <div>
                        <span className="detail-info-label">Indirizzo</span>
                        <span className="detail-info-value">{selectedActivity.location.address}</span>
                      </div>
                    </div>
                  )}

                  {selectedActivity.phone && (
                    <div className="detail-info-item">
                      <i className="fas fa-phone"></i>
                      <div>
                        <span className="detail-info-label">Telefono</span>
                        <a className="detail-info-value detail-link" href={`tel:${selectedActivity.phone}`}>{selectedActivity.phone}</a>
                      </div>
                    </div>
                  )}

                  {selectedActivity.website && (
                    <div className="detail-info-item">
                      <i className="fas fa-globe"></i>
                      <div>
                        <span className="detail-info-label">Sito web</span>
                        <a
                          className="detail-info-value detail-link"
                          href={selectedActivity.website}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {selectedActivity.website.replace(/^https?:\/\//, '').slice(0, 30)}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {selectedActivity.tips?.length > 0 && (
                  <div className="detail-tips">
                    <h4><i className="fas fa-lightbulb"></i> Consigli</h4>
                    <ul>
                      {selectedActivity.tips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="detail-actions">
                  {!isShared && (
                    <button className="btn-secondary" onClick={handleStartEdit}>
                      <i className="fas fa-edit"></i> Modifica
                    </button>
                  )}
                  {!isShared && (
                    <button className="btn-secondary" onClick={() => handleRegenerateActivity(selectedActivity)} disabled={regenerating}>
                      <i className={`fas ${regenerating ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i> Rigenera
                    </button>
                  )}
                  <button className="btn-primary" onClick={() => openInMaps(selectedActivity.location)}>
                    <i className="fas fa-map-marker-alt"></i> Apri in Maps
                  </button>
                  <button className="btn-secondary" onClick={() => openDirections(selectedActivity.location)}>
                    <i className="fas fa-directions"></i> Indicazioni
                  </button>
                  {selectedActivity.phone && (
                    <a className="btn-secondary" href={`tel:${selectedActivity.phone}`}>
                      <i className="fas fa-phone"></i> Chiama
                    </a>
                  )}
                  {selectedActivity.website && (
                    <a className="btn-secondary" href={selectedActivity.website} target="_blank" rel="noopener noreferrer">
                      <i className="fas fa-globe"></i> Sito Web
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile Detail Overlay */}
      {mobileDetailOpen && <div className="detail-backdrop" onClick={closeMobileDetail} />}

      {/* Share Modal */}
      {showShare && (
        <ShareModal trip={itinerary} onClose={() => setShowShare(false)} />
      )}

      {/* Trip Info Panel (when activity is null but info button clicked) */}
      {selectedActivity === null && mobileDetailOpen && (
        <div className="detail-panel mobile-open">
          <div className="detail-panel-header">
            <h3>Informazioni Viaggio</h3>
            <button className="btn-icon" onClick={closeMobileDetail}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="detail-panel-body">
            <p className="detail-description">{itinerary.summary}</p>

            {totalCost && (
              <div className="detail-info-item">
                <i className="fas fa-receipt"></i>
                <div>
                  <span className="detail-info-label">Costo totale stimato</span>
                  <span className="detail-info-value">{totalCost.currency} {totalCost.amount?.toLocaleString()}</span>
                </div>
              </div>
            )}

            {itinerary.tips?.length > 0 && (
              <div className="detail-tips">
                <h4><i className="fas fa-lightbulb"></i> Consigli di Viaggio</h4>
                <ul>
                  {itinerary.tips.map((tip, i) => <li key={i}>{tip}</li>)}
                </ul>
              </div>
            )}

            <PackingList />
          </div>
        </div>
      )}
    </div>
  )
}
