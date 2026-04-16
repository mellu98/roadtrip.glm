import { useState } from 'react'
import { Button, Input, Textarea, Select, SelectItem, Card, CardBody, Chip, Slider, Progress } from '@heroui/react'
import PlaceSearch from './PlaceSearch'

const TRAVEL_STYLES = [
  { id: 'adventure', label: 'Adventure', icon: '🏔️' },
  { id: 'cultural', label: 'Cultural', icon: '🏛️' },
  { id: 'relaxation', label: 'Relaxation', icon: '🏖️' },
  { id: 'foodie', label: 'Foodie', icon: '🍽️' },
  { id: 'nightlife', label: 'Nightlife', icon: '🌙' },
  { id: 'nature', label: 'Nature', icon: '🌿' },
  { id: 'budget', label: 'Budget', icon: '💰' },
  { id: 'luxury', label: 'Luxury', icon: '💎' },
]

const INTERESTS = [
  { id: 'museums', label: 'Museums', icon: '🎨' },
  { id: 'architecture', label: 'Architecture', icon: '🏰' },
  { id: 'local-food', label: 'Local Food', icon: '🍕' },
  { id: 'photography', label: 'Photography', icon: '📸' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️' },
  { id: 'history', label: 'History', icon: '📜' },
  { id: 'nightlife', label: 'Nightlife', icon: '🎵' },
  { id: 'outdoor', label: 'Outdoor', icon: '⛺' },
  { id: 'beaches', label: 'Beaches', icon: '🌊' },
  { id: 'markets', label: 'Markets', icon: '🏪' },
  { id: 'wine', label: 'Wine & Drinks', icon: '🍷' },
  { id: 'art', label: 'Art', icon: '🎭' },
]

const COMPANIONS = [
  { id: 'solo', label: 'Solo', icon: '🧳' },
  { id: 'couple', label: 'Couple', icon: '💑' },
  { id: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
  { id: 'friends', label: 'Friends', icon: '🎉' },
  { id: 'group', label: 'Large Group', icon: '👨‍👨‍👧‍👧' },
]

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'BRL', 'ARS', 'MXN', 'CAD', 'AUD']

const STEPS = [
  { title: 'Where & When', subtitle: 'Choose your destination', emoji: '🌍' },
  { title: 'Budget & Duration', subtitle: 'Define your resources', emoji: '💰' },
  { title: 'Travel Style', subtitle: 'How do you like to travel?', emoji: '✨' },
  { title: 'Interests', subtitle: 'What are you passionate about?', emoji: '🎯' },
  { title: 'Summary', subtitle: 'Review and generate', emoji: '📋' },
]

function ChoiceChip({ active, onPress, icon, label }) {
  return (
    <Chip
      variant={active ? 'solid' : 'bordered'}
      color={active ? 'primary' : 'default'}
      className="cursor-pointer transition-all"
      startContent={<span className="text-base">{icon}</span>}
      onClick={onPress}
      size="lg"
    >
      {label}
    </Chip>
  )
}

export default function TripForm({ onGenerate, onBack }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    destination: '',
    destinationLat: null,
    destinationLng: null,
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

  const handleSubmit = () => onGenerate(form)

  const currentStep = STEPS[step]
  const progressValue = ((step + 1) / STEPS.length) * 100

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10 pb-28 min-h-screen flex flex-col">
      <header className="flex items-center gap-3 mb-6">
        <Button
          isIconOnly
          variant="flat"
          onPress={onBack}
          aria-label="Go back"
        >
          <i className="fas fa-arrow-left" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold">New Trip</h1>
          <p className="text-sm text-default-500">{currentStep.subtitle}</p>
        </div>
        <Chip variant="flat" color="primary" size="sm">{step + 1}/{STEPS.length}</Chip>
      </header>

      <Progress
        aria-label="Progress"
        value={progressValue}
        color="primary"
        size="sm"
        className="mb-8"
      />

      <div className="flex-1">
        {step === 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl">{currentStep.emoji}</span>
              <h2 className="text-2xl font-bold">{currentStep.title}</h2>
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">Destination</label>
              <PlaceSearch
                value={form.destination}
                onChange={(val) => update('destination', val)}
                onSelect={(place) => {
                  update('destination', place.name)
                  if (place.lat && place.lng) {
                    update('destinationLat', place.lat)
                    update('destinationLng', place.lng)
                  }
                }}
                placeholder="e.g. Rome, Tokyo, Patagonia..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="date"
                label="Start date"
                value={form.startDate}
                onValueChange={(v) => handleDateChange('startDate', v)}
                min={new Date().toISOString().split('T')[0]}
                variant="bordered"
              />
              <Input
                type="date"
                label="End date"
                value={form.endDate}
                onValueChange={(v) => handleDateChange('endDate', v)}
                min={form.startDate || new Date().toISOString().split('T')[0]}
                variant="bordered"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl">{currentStep.emoji}</span>
              <h2 className="text-2xl font-bold">{currentStep.title}</h2>
            </div>
            <div>
              <label className="text-sm font-semibold mb-3 block">Trip duration</label>
              <div className="flex items-center justify-center gap-4 p-6 bg-content2 rounded-xl">
                <Button
                  isIconOnly
                  variant="flat"
                  onPress={() => update('duration', Math.max(1, form.duration - 1))}
                  aria-label="Fewer days"
                >
                  <i className="fas fa-minus" />
                </Button>
                <div className="flex flex-col items-center min-w-[100px]">
                  <span className="text-5xl font-extrabold text-primary">{form.duration}</span>
                  <span className="text-sm text-default-500">
                    {form.duration === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <Button
                  isIconOnly
                  variant="flat"
                  onPress={() => update('duration', form.duration + 1)}
                  aria-label="More days"
                >
                  <i className="fas fa-plus" />
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold mb-3 block">Total budget</label>
              <div className="flex gap-2 mb-3">
                <Select
                  selectedKeys={[form.currency]}
                  onSelectionChange={(keys) => update('currency', Array.from(keys)[0])}
                  className="max-w-28"
                  variant="bordered"
                  aria-label="Currency"
                >
                  {CURRENCIES.map(c => <SelectItem key={c}>{c}</SelectItem>)}
                </Select>
                <Input
                  type="number"
                  value={String(form.budget)}
                  onValueChange={(v) => update('budget', parseInt(v) || 0)}
                  min={100}
                  step={100}
                  variant="bordered"
                  size="lg"
                />
              </div>
              <Slider
                aria-label="Budget"
                minValue={100}
                maxValue={10000}
                step={100}
                value={form.budget}
                onChange={(v) => update('budget', Array.isArray(v) ? v[0] : v)}
                color="primary"
                showTooltip
              />
              <div className="flex justify-between text-xs text-default-400 mt-1">
                <span>100</span>
                <span>10,000</span>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl">{currentStep.emoji}</span>
              <h2 className="text-2xl font-bold">{currentStep.title}</h2>
            </div>
            <div>
              <label className="text-sm font-semibold mb-3 block">
                How do you like to travel?
                <span className="text-default-400 font-normal ml-1">(select one or more)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {TRAVEL_STYLES.map(s => (
                  <ChoiceChip
                    key={s.id}
                    active={form.travelStyle.includes(s.id)}
                    onPress={() => toggleArray('travelStyle', s.id)}
                    icon={s.icon}
                    label={s.label}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold mb-3 block">Who are you traveling with?</label>
              <div className="flex flex-wrap gap-2">
                {COMPANIONS.map(c => (
                  <ChoiceChip
                    key={c.id}
                    active={form.companions === c.id}
                    onPress={() => update('companions', form.companions === c.id ? '' : c.id)}
                    icon={c.icon}
                    label={c.label}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl">{currentStep.emoji}</span>
              <h2 className="text-2xl font-bold">{currentStep.title}</h2>
            </div>
            <div>
              <label className="text-sm font-semibold mb-3 block">
                Your interests
                <span className="text-default-400 font-normal ml-1">(select one or more)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(i => (
                  <ChoiceChip
                    key={i.id}
                    active={form.interests.includes(i.id)}
                    onPress={() => toggleArray('interests', i.id)}
                    icon={i.icon}
                    label={i.label}
                  />
                ))}
              </div>
            </div>
            <Input
              label="Must-see places"
              value={form.mustSee}
              onValueChange={(v) => update('mustSee', v)}
              placeholder="e.g. Colosseum, Trastevere, Vatican..."
              variant="bordered"
            />
            <Input
              label="Dietary restrictions"
              value={form.dietaryRestrictions}
              onValueChange={(v) => update('dietaryRestrictions', v)}
              placeholder="e.g. Vegetarian, gluten-free..."
              variant="bordered"
            />
            <Textarea
              label="Additional notes"
              value={form.additionalNotes}
              onValueChange={(v) => update('additionalNotes', v)}
              placeholder="Anything else I should know..."
              variant="bordered"
              minRows={3}
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl">{currentStep.emoji}</span>
              <h2 className="text-2xl font-bold">{currentStep.title}</h2>
            </div>
            <Card shadow="sm" className="border border-default-200">
              <CardBody className="gap-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    {form.destination || 'No destination set'}
                  </h3>
                  <div className="mt-2 space-y-1 text-sm text-default-600">
                    {form.startDate && form.endDate && (
                      <p className="flex items-center gap-2">
                        <i className="fas fa-calendar text-primary/60" />
                        {form.startDate} → {form.endDate}
                      </p>
                    )}
                    <p className="flex items-center gap-2">
                      <i className="fas fa-clock text-primary/60" />
                      {form.duration} {form.duration === 1 ? 'day' : 'days'}
                    </p>
                    <p className="flex items-center gap-2">
                      <i className="fas fa-wallet text-primary/60" />
                      {form.currency} {form.budget?.toLocaleString()}
                    </p>
                  </div>
                </div>

                {form.travelStyle.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-default-700 mb-2">Travel style</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {form.travelStyle.map(id => {
                        const s = TRAVEL_STYLES.find(t => t.id === id)
                        return s ? (
                          <Chip key={id} variant="flat" color="primary" size="sm">
                            {s.icon} {s.label}
                          </Chip>
                        ) : null
                      })}
                    </div>
                  </div>
                )}

                {form.companions && (
                  <div>
                    <h4 className="text-sm font-semibold text-default-700 mb-2">Companions</h4>
                    <Chip variant="flat" color="primary" size="sm">
                      {COMPANIONS.find(c => c.id === form.companions)?.icon}{' '}
                      {COMPANIONS.find(c => c.id === form.companions)?.label}
                    </Chip>
                  </div>
                )}

                {form.interests.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-default-700 mb-2">Interests</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {form.interests.map(id => {
                        const i = INTERESTS.find(t => t.id === id)
                        return i ? (
                          <Chip key={id} variant="flat" color="primary" size="sm">
                            {i.icon} {i.label}
                          </Chip>
                        ) : null
                      })}
                    </div>
                  </div>
                )}

                {(form.mustSee || form.dietaryRestrictions || form.additionalNotes) && (
                  <div className="space-y-1.5 text-sm">
                    <h4 className="text-sm font-semibold text-default-700 mb-1">Extra details</h4>
                    {form.mustSee && <p><strong>Must-see:</strong> {form.mustSee}</p>}
                    {form.dietaryRestrictions && <p><strong>Diet:</strong> {form.dietaryRestrictions}</p>}
                    {form.additionalNotes && <p><strong>Notes:</strong> {form.additionalNotes}</p>}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 mt-8 sticky bottom-4">
        {step > 0 ? (
          <Button
            variant="flat"
            onPress={() => setStep(step - 1)}
            startContent={<i className="fas fa-arrow-left" />}
          >
            Back
          </Button>
        ) : (
          <span />
        )}
        {step < STEPS.length - 1 ? (
          <Button
            color="primary"
            onPress={() => setStep(step + 1)}
            isDisabled={!canProceed()}
            endContent={<i className="fas fa-arrow-right" />}
          >
            Next
          </Button>
        ) : (
          <Button
            color="primary"
            size="lg"
            onPress={handleSubmit}
            isDisabled={!canProceed()}
            startContent={<i className="fas fa-magic" />}
            className="shadow-lg"
          >
            Generate Itinerary
          </Button>
        )}
      </div>
    </div>
  )
}
