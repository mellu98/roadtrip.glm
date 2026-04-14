import { useState, useEffect, useMemo } from 'react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Pie } from 'react-chartjs-2'
import { useBudgetStore } from '../store/budgetStore'
import { useTripStore } from '../store/tripStore'
import { BUDGET_CATEGORIES, getCategoryById, expensesByCategory, totalExpenses, expensesForDay } from '../utils/budget'

ChartJS.register(ArcElement, Tooltip, Legend)

export default function BudgetTracker({ currentDay, isShared }) {
  const { currentItinerary } = useTripStore()
  const { expenses, loadExpenses, addExpense, deleteExpense } = useBudgetStore()

  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('food')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(currentDay?.date || '')

  const tripId = currentItinerary?.id
  const budget = currentItinerary?.formData?.budget
  const currency = currentItinerary?.formData?.currency || '€'

  useEffect(() => {
    if (tripId) loadExpenses(tripId)
  }, [tripId])

  useEffect(() => {
    if (currentDay?.date) setDate(currentDay.date)
  }, [currentDay?.date])

  const dayExpenses = useMemo(
    () => (currentDay?.date ? expensesForDay(expenses, currentDay.date) : expenses),
    [expenses, currentDay?.date]
  )

  const dayTotal = useMemo(() => totalExpenses(dayExpenses), [dayExpenses])
  const allTotal = useMemo(() => totalExpenses(expenses), [expenses])
  const byCategory = useMemo(() => expensesByCategory(expenses), [expenses])

  const remaining = budget ? budget - allTotal : null
  const isOver = remaining !== null && remaining < 0

  const chartData = useMemo(() => {
    const labels = []
    const data = []
    const colors = []
    BUDGET_CATEGORIES.forEach(cat => {
      if (byCategory[cat.id]) {
        labels.push(cat.label)
        data.push(byCategory[cat.id])
        colors.push(cat.color)
      }
    })
    if (data.length === 0) {
      labels.push('Nessuna spesa')
      data.push(1)
      colors.push('#dfe6e9')
    }
    return {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: 'var(--bg-secondary)',
      }],
    }
  }, [byCategory])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle',
          font: { size: 12, family: 'Inter, sans-serif' },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${currency} ${ctx.parsed.toLocaleString()}`,
        },
      },
    },
  }

  const handleAdd = (e) => {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) return
    addExpense(tripId, {
      amount: numAmount,
      category,
      description,
      date,
    })
    setAmount('')
    setDescription('')
  }

  const handleDelete = (expenseId) => {
    deleteExpense(tripId, expenseId)
  }

  // Estimated costs from AI itinerary by category
  const estimatedByCategory = useMemo(() => {
    const map = {}
    if (!currentItinerary?.days) return map
    currentItinerary.days.forEach(day => {
      day.activities?.forEach(act => {
        if (act.price && act.price.type !== 'free' && act.price.amount) {
          const cat = act.type === 'accommodation' ? 'accommodation'
            : act.type === 'restaurant' ? 'food'
            : act.type === 'transport' ? 'transport'
            : 'attractions'
          map[cat] = (map[cat] || 0) + act.price.amount
        }
      })
    })
    return map
  }, [currentItinerary])

  return (
    <div className="budget-tracker">
      {/* Overview Cards */}
      <div className="budget-overview">
        <div className="budget-card">
          <span className="budget-card-label">Budget</span>
          <span className="budget-card-value">{budget ? `${currency} ${budget.toLocaleString()}` : '—'}</span>
        </div>
        <div className="budget-card">
          <span className="budget-card-label">Speso</span>
          <span className="budget-card-value spent">{currency} {allTotal.toLocaleString()}</span>
        </div>
        <div className="budget-card">
          <span className="budget-card-label">Rimanente</span>
          <span className={`budget-card-value ${isOver ? 'overbudget' : 'remaining'}`}>
            {remaining !== null ? `${currency} ${remaining.toLocaleString()}` : '—'}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="budget-chart-container">
        <h3 className="budget-section-title">Spese per categoria</h3>
        <div style={{ maxWidth: 250, margin: '0 auto' }}>
          <Pie data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Estimated vs Actual */}
      {Object.keys(estimatedByCategory).length > 0 && (
        <div className="budget-comparison">
          <h3 className="budget-section-title">Stimato vs Effettivo</h3>
          <div className="budget-comparison-list">
            {BUDGET_CATEGORIES.filter(cat => estimatedByCategory[cat.id]).map(cat => (
              <div key={cat.id} className="budget-comparison-row">
                <span className="budget-comparison-label">{cat.icon} {cat.label}</span>
                <span className="budget-comparison-estimated">{currency} {estimatedByCategory[cat.id].toLocaleString()}</span>
                <span className="budget-comparison-actual">{currency} {(byCategory[cat.id] || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Expense Form */}
      {!isShared && (
        <div className="expense-form-section">
          <h3 className="budget-section-title">Aggiungi spesa</h3>
          <form className="expense-form" onSubmit={handleAdd}>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Importo"
              min="0"
              step="0.01"
              required
            />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {BUDGET_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrizione"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <button type="submit" className="btn-primary btn-sm">
              <i className="fas fa-plus"></i> Aggiungi
            </button>
          </form>
        </div>
      )}

      {/* Expenses List */}
      <div className="expense-list-section">
        <h3 className="budget-section-title">
          Spese {currentDay?.date ? `— Giorno ${currentDay.dayNumber}` : ''}
          <span className="expense-list-total">{currency} {dayTotal.toLocaleString()}</span>
        </h3>
        {dayExpenses.length === 0 ? (
          <p className="expense-list-empty">Nessuna spesa registrata</p>
        ) : (
          <div className="expense-list">
            {dayExpenses.map(exp => {
              const cat = getCategoryById(exp.category)
              return (
                <div key={exp.id} className="expense-item">
                  <span className="expense-item-icon">{cat.icon}</span>
                  <div className="expense-item-info">
                    <span className="expense-item-desc">{exp.description || cat.label}</span>
                    <span className="expense-item-meta">{cat.label}</span>
                  </div>
                  <span className="expense-item-amount">{currency} {exp.amount.toLocaleString()}</span>
                  {!isShared && (
                    <button
                      className="expense-item-delete"
                      onClick={() => handleDelete(exp.id)}
                      title="Elimina spesa"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
