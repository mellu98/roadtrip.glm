import { create } from 'zustand'

const BUDGET_KEY = 'roadtrip_budget_'

function getExpenses(tripId) {
  try {
    const raw = localStorage.getItem(BUDGET_KEY + tripId)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveExpenses(tripId, expenses) {
  try {
    localStorage.setItem(BUDGET_KEY + tripId, JSON.stringify(expenses))
  } catch {}
}

export const useBudgetStore = create((set, get) => ({
  expenses: [],

  loadExpenses: (tripId) => {
    set({ expenses: getExpenses(tripId) })
  },

  addExpense: (tripId, expense) => {
    const expenses = [...get().expenses, { ...expense, id: Date.now().toString() }]
    saveExpenses(tripId, expenses)
    set({ expenses })
  },

  deleteExpense: (tripId, expenseId) => {
    const expenses = get().expenses.filter(e => e.id !== expenseId)
    saveExpenses(tripId, expenses)
    set({ expenses })
  },

  clearExpenses: () => set({ expenses: [] }),
}))
