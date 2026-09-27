/** tmdb: TMDB API / seed: 開発用シードデータ */
export type MovieSource = 'tmdb' | 'seed'

export type Movie = {
  id: string
  title: string
  originalTitle?: string
  releaseDate: string
  runtime?: number
  genres: string[]
  poster: string
  distributor?: string
  synopsis: string
  source: MovieSource
}

export type TimeSlot = 'morning' | 'noon' | 'evening' | 'late'

export type Candidate = {
  id: string
  date: string
  slot: TimeSlot
}

export type Answer = 'yes' | 'maybe' | 'no'

export type Participant = {
  id: string
  name: string
  comment?: string
  answers: Record<string, Answer>
}

/** 決定した回について幹事が実際に取った予約 */
export type Reservation = {
  theater: string
  /** 上映開始時刻 HH:MM */
  showtime?: string
  note?: string
  reservedBy?: string
  reservedAt: string
}

export type ScheduleEvent = {
  id: string
  /** 作成時点の作品情報。外部ソースの変化に影響されないようスナップショットで持つ */
  movie: Movie
  title: string
  organizer?: string
  memo?: string
  deadline?: string
  candidates: Candidate[]
  participants: Participant[]
  decidedCandidateId?: string
  reservation?: Reservation
  createdAt: string
}

export type CandidateTally = {
  yes: number
  maybe: number
  no: number
  score: number
}

/** サーバーで集計済みのイベント。クライアントはこれを表示するだけ */
export type EventView = ScheduleEvent & {
  /** 閲覧者が幹事か（幹事キーのクッキーで判定） */
  isOrganizer: boolean
  /** 幹事のときだけ返す。幹事用 URL の表示に使う */
  organizerKey?: string
  tallies: Record<string, CandidateTally>
  best?: { candidateId: string } & CandidateTally
}

export type EventSummary = {
  id: string
  title: string
  poster: string
  respondentCount: number
  decidedCandidate?: Candidate
  reserved: boolean
  isOrganizer: boolean
}
