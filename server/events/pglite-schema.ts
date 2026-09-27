/** PGlite / PostgreSQL 共通のスキーマ。本番 DB 導入時のマイグレーションの起点 */
export const EVENT_SCHEMA_SQL = `
create table if not exists events (
  id text primary key,
  movie jsonb not null,
  title text not null,
  organizer text,
  memo text,
  deadline date,
  decided_candidate_id text,
  created_at timestamptz not null
);

create table if not exists candidates (
  event_id text not null references events (id) on delete cascade,
  id text not null,
  date date not null,
  slot text not null check (slot in ('morning', 'noon', 'evening', 'late')),
  position integer not null,
  primary key (event_id, id)
);

create table if not exists participants (
  event_id text not null references events (id) on delete cascade,
  id text not null,
  name text not null,
  comment text,
  answers jsonb not null default '{}',
  position serial,
  primary key (event_id, id)
);
`
