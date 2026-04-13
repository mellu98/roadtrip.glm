import { useState } from 'react'

const TRAVEL_STYLES = [
  { id: 'adventure', label: 'Avventura', icon: '🏔️' },
  { id: 'cultural', label: 'Culturale', icon: '🏛️' },
  { id: 'relaxation', label: 'Relax', icon: '🏖️' },
  { id: 'foodie', label: 'Gastronomico', icon: '🍽️' },
  { id: 'nightlife', label: 'Vita Notturna', icon: '🌙' },
  { id: 'nature', label: 'Natura', icon: '🌿' },
  { id: 'budget', label: 'Economico', icon: '💰' },
  { id: 'luxury', label: 'Lusso', icon: '💎' },
]

const INTERESTS = [
  { id: 'museums', label: 'Musei', icon: '🎨' },
  { id: 'architecture', label: 'Architettura', icon: '🏰' },
  { id: 'local-food', label: 'Cibo Locale', icon: '🍕' },
  { id: 'photography', label: 'Fotografia', icon: '📸' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️' },
  { id: 'history', label: 'Storia', icon: '📜' },
  { id: 'nightlife', label: 'Vita Notturna', icon: '🎵' },
  { id: 'outdoor', label: 'All\'aperto', icon: '⛺' },
  { id: 'beaches', label: 'Spiagge', icon: '🌊' },
  { id: 'markets', label: 'Mercati', icon: '🏪' },
  { id: 'wine', label: 'Vino & Drink', icon: '🍷' },
  { id: 'art', label: 'Arte', icon: '🎭' },
]

const COMPANIONS = [
  { id: 'solo', label: 'Da solo', icon: '🧳' },
  { id: 'couple', label: 'In coppia', icon: '💑' },
  { id: 'family', label: 'Famiglia', icon: '👨‍👩‍👧‍👦' },
  { id: 'friends', label: 'Amici', icon: '🎉' },
  { id: 'group', label: 'Gruppo grande', icon: '👨‍👨‍👧‍👧' },
]

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'BRL', 'ARS', 'MXN', 'CAD', 'AUD']

const STEPS = [
  { title: 'Dove & Quando', subtitle: 'Scegli la tua destinazione' },
  { title: 'Budget & Durata', subtitle: 'Definisci le tue risorse' },
  { title: 'Stile di Viaggio', subtitle: 'Come ti piace viaggiare?' },
  { title: 'Interessi', subtitle: 'Cosa ti appassiona?' },
  { title: 'Riepilogo', subtitle: 'Controlla e genera' },
]

export default function TripForm({ onGenerate, onBack }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    duration: 3,
    budget: 1500,
    currency: 'EUR',
    travelStyle: [],
    companions: '',
    interests: [],
    dietaryRestrictions: '',
    mobilityNeeds: '',
    mustSee: '',
    additionalNotes: '',
  })

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }))
  const toggleArray = (field, id) => {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(id)
        ? f[field].filter(x => x !== id)
        : [...f[field], id]
    }))
  }

  // Auto-calculate duration from dates
  const handleDateChange = (field, value) => {
    update(field, value)
    const other = field === 'startDate' ? form.endDate : form.startDate
    if (value && other) {
      const diff = Math.ceil((new Date(other) - new Date(value)) / (1000 * 60 * 60 * 24))
      if (diff > 0) update('duration', diff)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 0: return form.destination.trim().length >= 2
      case 1: return form.duration > 0 && form.budget > 0
      case 2: return form.travelStyle.length > 0
      case 3: return true
      case 4: return true
      default: return false
    }
  }

  const handleSubmit = () => {
    onGenerate(form)
  }

  return (
    <div className="trip-form-container">
      <div className="form-header">
        <button className="btn-icon" onClick={onBack} title="Torna indietro">
          <i className="fas fa-arrow-left"></i>
        </button>
        <div className="form-header-text">
          <h1>Nuovo Viaggio</h1>
          <p className="form-subtitle">{STEPS[step].subtitle}</p>
        </div>
        <div className="step-indicator">{step + 1}/{STEPS.length}</div>
      </div>

      <div className="progress-bar">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`progress-segment ${i < step ? 'completed' : ''} ${i === step ? 'active' : ''}`}
            onClick={() => i < step && setStep(i)}
          />
        ))}
      </div>

      <div className="form-step">
        {step === 0 && (
          <div className="step-content">
            <div className="step-intro">
              <span className="step-emoji">🌍</span>
              <h2>{STEPS[0].title}</h2>
            </div>
            <div className="form-group">
              <label>Destinazione</label>
              <input
                type="text"
                value={form.destination}
                onChange={e => update('destination', e.target.value)}
                placeholder="Es: Roma, Tokyo, Patagonia..."
                className="input-large"
                autoFocus
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Data di inizio</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => handleDateChange('startDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="form-group">
                <label>Data di fine</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={e => handleDateChange('endDate', e.target.value)}
                  min={form.startDate || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="step-content">
            <div className="step-intro">
              <span className="step-emoji">💰</span>
              <h2>{STEPS[1].title}</h2>
            </div>
            <div className="form-group">
              <label>Durata del viaggio</label>
              <div className="duration-control">
                <button onClick={() => update('duration', Math.max(1, form.duration - 1))}>
                  <i className="fas fa-minus"></i>
                </button>
                <div className="duration-display">
                  <span className="duration-number">{form.duration}</span>
                  <span className="duration-label">{form.duration === 1 ? 'giorno' : 'giorni'}</span>
                </div>
                <button onClick={() => update('duration', form.duration + 1)}>
                  <i className="fas fa-plus"></i>
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>Budget totale</label>
              <div className="budget-input">
                <select value={form.currency} onChange={e => update('currency', e.target.value)}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input
                  type="number"
                  value={form.budget}
                  onChange={e => update('budget', parseInt(e.target.value) || 0)}
                  min={100}
                  step={100}
                  className="input-large"
                />
              </div>
              <input
                type="range"
                min={100}
                max={10000}
                step={100}
                value={form.budget}
                onChange={e => update('budget', parseInt(e.target.value))}
                className="budget-slider"
              />
              <div className="budget-labels">
                <span>100</span>
                <span>10.000</span>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-content">
            <div className="step-intro">
              <span className="step-emoji">✨</span>
              <h2>{STEPS[2].title}</h2>
            </div>
            <div className="form-group">
              <label>Come ti piace viaggiare? <span className="label-hint">(seleziona uno o più)</span></label>
              <div className="chip-grid">
                {TRAVEL_STYLES.map(s => (
                  <button
                    key={s.id}
                    className={`chip ${form.travelStyle.includes(s.id) ? 'active' : ''}`}
                    onClick={() => toggleArray('travelStyle', s.id)}
                  >
                    <span className="chip-icon">{s.icon}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Con chi viaggi?</label>
              <div className="chip-grid">
                {COMPANIONS.map(c => (
                  <button
                    key={c.id}
                    className={`chip ${form.companions === c.id ? 'active' : ''}`}
                    onClick={() => update('companions', form.companions === c.id ? '' : c.id)}
                  >
                    <span className="chip-icon">{c.icon}</span>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-content">
            <div className="step-intro">
              <span className="step-emoji">🎯</span>
              <h2>{STEPS[3].title}</h2>
            </div>
            <div className="form-group">
              <label>I tuoi interessi <span className="label-hint">(seleziona uno o più)</span></label>
              <div className="chip-grid">
                {INTERESTS.map(i => (
                  <button
                    key={i.id}
                    className={`chip ${form.interests.includes(i.id) ? 'active' : ''}`}
                    onClick={() => toggleArray('interests', i.id)}
                  >
                    <span className="chip-icon">{i.icon}</span>
                    {i.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Luoghi imperdibili</label>
              <input
                type="text"
                value={form.mustSee}
                onChange={e => update('mustSee', e.target.value)}
                placeholder="Es: Colosseo, Trastevere, Vatican..."
              />
            </div>
            <div className="form-group">
              <label>Restrizioni alimentari</label>
              <input
                type="text"
                value={form.dietaryRestrictions}
                onChange={e => update('dietaryRestrictions', e.target.value)}
                placeholder="Es: Vegetariano, senza glutine..."
              />
            </div>
            <div className="form-group">
              <label>Note aggiuntive</label>
              <textarea
                value={form.additionalNotes}
                onChange={e => update('additionalNotes', e.target.value)}
                placeholder="Qualsiasi altra cosa dovrei sapere..."
                rows={3}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="step-content">
            <div className="step-intro">
              <span className="step-emoji">📋</span>
              <h2>{STEPS[4].title}</h2>
            </div>
            <div className="review-card">
              <div className="review-destination">
                <h3>{form.destination || 'Destinazione non impostata'}</h3>
                {form.startDate && form.endDate && (
                  <p><i className="fas fa-calendar"></i> {form.startDate} → {form.endDate}</p>
                )}
                <p><i className="fas fa-clock"></i> {form.duration} {form.duration === 1 ? 'giorno' : 'giorni'}</p>
                <p><i className="fas fa-wallet"></i> {form.currency} {form.budget?.toLocaleString()}</p>
              </div>

              {form.travelStyle.length > 0 && (
                <div className="review-section">
                  <h4>Stile di viaggio</h4>
                  <div className="review-chips">
                    {form.travelStyle.map(id => {
                      const s = TRAVEL_STYLES.find(t => t.id === id)
                      return s ? <span key={id} className="review-chip">{s.icon} {s.label}</span> : null
                    })}
                  </div>
                </div>
              )}

              {form.companions && (
                <div className="review-section">
                  <h4>Compagni</h4>
                  <span className="review-chip">
                    {COMPANIONS.find(c => c.id === form.companions)?.icon}{' '}
                    {COMPANIONS.find(c => c.id === form.companions)?.label}
                  </span>
                </div>
              )}

              {form.interests.length > 0 && (
                <div className="review-section">
                  <h4>Interessi</h4>
                  <div className="review-chips">
                    {form.interests.map(id => {
                      const i = INTERESTS.find(t => t.id === id)
                      return i ? <span key={id} className="review-chip">{i.icon} {i.label}</span> : null
                    })}
                  </div>
                </div>
              )}

              {(form.mustSee || form.dietaryRestrictions || form.additionalNotes) && (
                <div className="review-section">
                  <h4>Dettagli extra</h4>
                  {form.mustSee && <p><strong>Imperdibili:</strong> {form.mustSee}</p>}
                  {form.dietaryRestrictions && <p><strong>Dieta:</strong> {form.dietaryRestrictions}</p>}
                  {form.additionalNotes && <p><strong>Note:</strong> {form.additionalNotes}</p>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="form-actions">
        {step > 0 && (
          <button className="btn-secondary" onClick={() => setStep(step - 1)}>
            <i className="fas fa-arrow-left"></i> Indietro
          </button>
        )}
        <div className="form-actions-spacer" />
        {step < STEPS.length - 1 ? (
          <button
            className="btn-primary"
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
          >
            Avanti <i className="fas fa-arrow-right"></i>
          </button>
        ) : (
          <button
            className="btn-generate"
            onClick={handleSubmit}
            disabled={!canProceed()}
          >
            <i className="fas fa-magic"></i> Genera Itinerario
          </button>
        )}
      </div>
    </div>
  )
}
