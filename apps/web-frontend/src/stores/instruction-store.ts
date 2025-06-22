import { create } from 'zustand'

interface ParsedInstruction {
  contractName: string
  volM: number
  direction: string
  time: string
  level: string
  quantity: number
  price: number
  margin: number
  cashD: number
  cashV: number
}

interface InstructionState {
  rawInstruction: string
  parsedInstructions: ParsedInstruction[]
  isLoading: boolean
  error: string | null
  history: string[]
  
  setRawInstruction: (instruction: string) => void
  parseInstruction: (instruction: string) => Promise<void>
  loadHistory: () => Promise<void>
  clearError: () => void
}

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3001'

export const useInstructionStore = create<InstructionState>((set, get) => ({
  rawInstruction: '',
  parsedInstructions: [],
  isLoading: false,
  error: null,
  history: [],

  setRawInstruction: (instruction: string) => {
    set({ rawInstruction: instruction })
  },

  parseInstruction: async (instruction: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch(`${API_GATEWAY_URL}/api/v1/instructions/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
        },
        body: JSON.stringify({ instruction }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to parse instruction')
      }

      const data = await response.json()
      
      set({
        parsedInstructions: data.instructions,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      set({
        parsedInstructions: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      })
    }
  },

  loadHistory: async () => {
    try {
      const response = await fetch(`${API_GATEWAY_URL}/api/v1/instructions/history`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        set({ history: data.history || [] })
      }
    } catch (error) {
      console.error('Failed to load instruction history:', error)
    }
  },

  clearError: () => set({ error: null }),
}))