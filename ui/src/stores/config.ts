import { create } from 'zustand'

export interface configType {
    address: string
    setAddress: (address: string) => void
}

export default create<configType>(set => ({
    address:
        import.meta.env.MODE == 'production' ? '' : 'http://localhost:9513',
    setAddress: (address: string) => set({ address })
}))
