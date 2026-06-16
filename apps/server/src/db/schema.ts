import { int, sqliteTable, text, real } from 'drizzle-orm/sqlite-core'
import type { PrinterState } from 'utils'

export const clientsTable = sqliteTable('Clients', {
    id: int().primaryKey(),
    label: text().notNull(),
    state: text().$type<PrinterState>().notNull(),
    connected: int({ mode: 'boolean' }).notNull(),
    position: text({ mode: 'json' }).$type<[number, number, number]>(),
    fuel: int(),
    progress: real(),
    partIndex: int()
})
