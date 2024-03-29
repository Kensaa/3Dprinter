import type {
    Build as FullBuild,
    Printer as FullPrinter,
    Task as FullTask
} from 'printer-types'

export type Printer = Omit<FullPrinter, 'ws'>
export type Task = Omit<FullTask, 'parts'>
export type Build = FullBuild
