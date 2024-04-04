import type {
    Build as FullBuild,
    CompressedBuild as FullCompressedBuild,
    Printer as FullPrinter,
    Task as FullTask
} from 'printer-types'

export type Printer = Omit<FullPrinter, 'ws'>
export type Task = Omit<FullTask, 'parts'>
export type Build = FullBuild
export type CompressedBuild = FullCompressedBuild
