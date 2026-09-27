import { relations } from 'drizzle-orm'
import { check, date, integer, jsonb, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm/sql'
import type { Answer, Movie, MovieSource } from '@/lib/types'

// カラム名は drizzle の casing: 'snake_case' で自動変換する（createdAt -> created_at）

/** 映画マスタ。開発時はシードで投入し、外部ソース（TMDB / 映画.com）の結果とあわせてカタログに並ぶ */
export const movies = pgTable('movies', {
  id: text().primaryKey(),
  title: text().notNull(),
  originalTitle: text(),
  releaseDate: date({ mode: 'string' }).notNull(),
  runtime: integer(),
  genres: jsonb().$type<string[]>().notNull().default([]),
  poster: text().notNull(),
  distributor: text(),
  synopsis: text().notNull().default(''),
  source: text().$type<MovieSource>().notNull(),
})

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

/** 決定した回の予約（events と 1:1） */
export const reservations = pgTable('reservations', {
  eventId: text()
    .primaryKey()
    .references(() => events.id, { onDelete: 'cascade' }),
  theater: text().notNull(),
  showtime: text(),
  note: text(),
  reservedBy: text(),
  reservedAt: timestamp({ withTimezone: true }).notNull(),
})

export const eventsRelations = relations(events, ({ many, one }) => ({
  candidates: many(candidates),
  participants: many(participants),
  reservation: one(reservations),
}))

export const reservationsRelations = relations(reservations, ({ one }) => ({
  event: one(events, { fields: [reservations.eventId], references: [events.id] }),
}))

export const candidatesRelations = relations(candidates, ({ one }) => ({
  event: one(events, { fields: [candidates.eventId], references: [events.id] }),
}))

export const participantsRelations = relations(participants, ({ one }) => ({
  event: one(events, { fields: [participants.eventId], references: [events.id] }),
}))
