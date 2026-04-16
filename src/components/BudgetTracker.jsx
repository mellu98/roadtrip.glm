import { useState, useEffect, useMemo } from 'react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Pie } from 'react-chartjs-2'
import { Card, CardBody, Button, Input, Select, SelectItem } from '@heroui/react'
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
      labels.push('No expenses')
      data.push(1)
      colors.push('#dfe6e9')
    }
    return {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: 'transparent',
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
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card shadow="sm">
          <CardBody className="items-center gap-1 py-4">
            <span className="text-xs text-default-500 uppercase tracking-wide">Budget</span>
            <span className="font-heading text-lg text-foreground">
              {budget ? `${currency} ${budget.toLocaleString()}` : '—'}
            </span>
          </CardBody>
        </Card>
        <Card shadow="sm">
          <CardBody className="items-center gap-1 py-4">
            <span className="text-xs text-default-500 uppercase tracking-wide">Spent</span>
            <span className="font-heading text-lg text-danger">
              {currency} {allTotal.toLocaleString()}
            </span>
          </CardBody>
        </Card>
        <Card shadow="sm">
          <CardBody className="items-center gap-1 py-4">
            <span className="text-xs text-default-500 uppercase tracking-wide">Remaining</span>
            <span className={`font-heading text-lg ${isOver ? 'text-danger' : 'text-success'}`}>
              {remaining !== null ? `${currency} ${remaining.toLocaleString()}` : '—'}
            </span>
          </CardBody>
        </Card>
      </div>

      {/* Chart */}
      <Card shadow="sm">
        <CardBody>
          <h3 className="font-heading text-base mb-3">Expenses by Category</h3>
          <div className="max-w-[250px] mx-auto h-[250px]">
            <Pie data={chartData} options={chartOptions} />
          </div>
        </CardBody>
      </Card>

      {/* Estimated vs Actual */}
      {Object.keys(estimatedByCategory).length > 0 && (
        <Card shadow="sm">
          <CardBody>
            <h3 className="font-heading text-base mb-3">Estimated vs Actual</h3>
            <div className="space-y-2">
              <div className="grid grid-cols-3 text-xs text-default-500 font-semibold">
                <span>Category</span>
                <span className="text-right">Estimated</span>
                <span className="text-right">Actual</span>
              </div>
              {BUDGET_CATEGORIES.filter(cat => estimatedByCategory[cat.id]).map(cat => (
                <div key={cat.id} className="grid grid-cols-3 items-center text-sm">
                  <span className="flex items-center gap-2">
                    <span>{cat.icon}</span> {cat.label}
                  </span>
                  <span className="text-right text-default-500">
                    {currency} {estimatedByCategory[cat.id].toLocaleString()}
                  </span>
                  <span className="text-right font-semibold text-foreground">
                    {currency} {(byCategory[cat.id] || 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Add Expense Form */}
      {!isShared && (
        <Card shadow="sm">
          <CardBody>
            <h3 className="font-heading text-base mb-3">Add Expense</h3>
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                type="number"
                label="Amount"
                value={amount}
                onValueChange={setAmount}
                min="0"
                step="0.01"
                variant="bordered"
                size="sm"
                isRequired
              />
              <Select
                label="Category"
                selectedKeys={[category]}
                onSelectionChange={(keys) => setCategory(Array.from(keys)[0])}
                variant="bordered"
                size="sm"
              >
                {BUDGET_CATEGORIES.map(cat => (
                  <SelectItem key={cat.id}>{cat.icon} {cat.label}</SelectItem>
                ))}
              </Select>
              <Input
                label="Description"
                value={description}
                onValueChange={setDescription}
                variant="bordered"
                size="sm"
              />
              <Input
                type="date"
                label="Date"
                value={date}
                onValueChange={setDate}
                variant="bordered"
                size="sm"
              />
              <Button
                type="submit"
                color="primary"
                startContent={<i className="fas fa-plus" />}
                className="md:col-span-2"
              >
                Add Expense
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Expenses List */}
      <Card shadow="sm">
        <CardBody>
          <h3 className="font-heading text-base mb-3 flex items-center justify-between">
            <span>Expenses {currentDay?.date ? `— Day ${currentDay.dayNumber}` : ''}</span>
            <span className="text-sm text-default-500 font-sans font-normal">
              {currency} {dayTotal.toLocaleString()}
            </span>
          </h3>
          {dayExpenses.length === 0 ? (
            <p className="text-center text-default-400 text-sm py-6">No expenses recorded</p>
          ) : (
            <div className="space-y-2">
              {dayExpenses.map(exp => {
                const cat = getCategoryById(exp.category)
                return (
                  <div key={exp.id} className="flex items-center gap-3 p-3 rounded-medium bg-content2">
                    <span className="text-xl">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {exp.description || cat.label}
                      </div>
                      <div className="text-xs text-default-500">{cat.label}</div>
                    </div>
                    <span className="font-semibold text-foreground">
                      {currency} {exp.amount.toLocaleString()}
                    </span>
                    {!isShared && (
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        onPress={() => handleDelete(exp.id)}
                        aria-label="Delete expense"
                      >
                        <i className="fas fa-trash-alt" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
