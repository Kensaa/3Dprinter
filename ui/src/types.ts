export interface Build {
    type: 'model' | 'image'
    shape: number[][][]
}

export type PrinterState = 'idle' | 'building' | 'moving'
export interface Printer {
    id: number
    label: string
    state: PrinterState
    connected: boolean
    pos?: [number, number, number]
    progress?: number
}
