import type { Printer as FullPrinter } from 'utils'

export type Printer = Omit<FullPrinter, 'ws'>
