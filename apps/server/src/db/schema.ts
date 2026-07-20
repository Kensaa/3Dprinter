import { primaryKey } from 'drizzle-orm/sqlite-core'
import { int, sqliteTable, text, real } from 'drizzle-orm/sqlite-core'
import type { PrinterState } from 'utils'

export const clientsTable = sqliteTable('Clients', {
    id: int().primaryKey(),
    type: text().$type<'printer' | 'provider'>().notNull(),
    connected: int({ mode: 'boolean' }).notNull(),
    label: text().notNull(),
    chest_nbt: text().notNull(), // NBT hash of the enderchest (used to match printer with providers)

    // Only for printers
    state: text().$type<PrinterState>().notNull().default('idle'),
    position: text({ mode: 'json' }).$type<[number, number, number]>(),
    fuel: int(),
    progress: real(),
    partIndex: int()
})

export const lockStateTable = sqliteTable('LockState', {
    providerID: int()
        .primaryKey()
        .notNull()
        .references(() => clientsTable.id),
    clientID: int()
        .notNull()
        .references(() => clientsTable.id)
})
export const lockQueueTable = sqliteTable(
    'LockQueue',
    {
        providerID: int()
            .notNull()
            .references(() => clientsTable.id),
        clientID: int()
            .notNull()
            .references(() => clientsTable.id),
        created_at: int({ mode: 'timestamp' }).notNull()
    },
    table => [
        primaryKey({
            columns: [table.providerID, table.clientID]
        })
    ]
)
