export const BUDGET_CATEGORIES = [
  { id: 'accommodation', label: 'Accommodation', icon: '🏨', color: '#6c5ce7' },
  { id: 'food', label: 'Food', icon: '🍽️', color: '#e07a5f' },
  { id: 'transport', label: 'Transport', icon: '🚗', color: '#636e72' },
  { id: 'attractions', label: 'Attractions', icon: '🏛️', color: '#3d85c6' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️', color: '#f2cc8f' },
  { id: 'other', label: 'Other', icon: '📦', color: '#81b29a' },
]

export function getCategoryById(id) {
  return BUDGET_CATEGORIES.find(c => c.id === id) || BUDGET_CATEGORIES[BUDGET_CATEGORIES.length - 1]
}

export function expensesByCategory(expenses) {
  const map = {}
  expenses.forEach(exp => {
    const cat = exp.category || 'other'
    map[cat] = (map[cat] || 0) + exp.amount
  })
  return map
}

export function totalExpenses(expenses) {
  return expenses.reduce((sum, e) => sum + e.amount, 0)
}

export function expensesForDay(expenses, date) {
  return expenses.filter(e => e.date === date)
}
