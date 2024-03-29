import { create } from 'zustand'

export interface configType {
    address: string
    setAddress: (address: string) => void
    disableRender: boolean
    setDisableRender: (disableRender: boolean) => void
}

const store = create<configType>(set => ({
    address:
        import.meta.env.MODE == 'production' ? '' : 'http://localhost:9513',
    disableRender: false,
    setAddress: (address: string) => set({ address }),
    setDisableRender: (disableRender: boolean) => set({ disableRender })
}))

export const useConfig = store

export const useAddress = () => useConfig(state => state.address)
