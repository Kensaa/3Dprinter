import type { Printer as FullPrinter, Task as FullTask } from 'utils'

export type Printer = Omit<FullPrinter, 'ws'>
export type Task = Omit<FullTask, 'parts'>
