import { relations } from 'drizzle-orm'
import { check, date, integer, jsonb, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm/sql'
import type { Answer, Movie } from '@/lib/types'

// カラム名は drizzle の casing: 'snake_case' で自動変換する（createdAt -> created_at）

export const events = pgTable('events', {
  id: text().primaryKey(),
  /** 作成時点の作品情報のスナップショット */
  movie: jsonb().$type<Movie>().notNull(),
  title: text().notNull(),
  organizer: text(),
  memo: text(),
  deadline: date({ mode: 'string' }),
  decidedCandidateId: text(),
  createdAt: timestamp({ withTimezone: true }).notNull(),
})

export const candidates = pgTable(
  'candidates',
  {
    eventId: text()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    id: text().notNull(),
    date: date({ mode: 'string' }).notNull(),
    slot: text({ enum: ['morning', 'noon', 'evening', 'late'] }).notNull(),
    position: integer().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.id] }),
    check('candidates_slot_check', sql`${table.slot} in ('morning', 'noon', 'evening', 'late')`),
  ],
)

export const participants = pgTable(
  'participants',
  {
    eventId: text()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    id: text().notNull(),
    name: text().notNull(),
    comment: text(),
    answers: jsonb().$type<Record<string, Answer>>().notNull().default({}),
    /** 回答順を保つための連番 */
    position: integer().generatedAlwaysAsIdentity(),
  },
  (table) => [primaryKey({ columns: [table.eventId, table.id] })],
)

export const eventsRelations = relations(events, ({ many }) => ({
  candidates: many(candidates),
  participants: many(participants),
}))

export const candidatesRelations = relations(candidates, ({ one }) => ({
  event: one(events, { fields: [candidates.eventId], references: [events.id] }),
}))

export const participantsRelations = relations(participants, ({ one }) => ({
  event: one(events, { fields: [participants.eventId], references: [events.id] }),
}))
