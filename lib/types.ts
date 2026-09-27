export type MovieSource = 'eiga' | 'tmdb'

export type Movie = {
  id: string
  title: string
  originalTitle?: string
  releaseDate: string
  runtime: number
  genres: string[]
  poster: string
  distributor: string
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

export type ScheduleEvent = {
  id: string
  movieId: string
  title: string
  memo?: string
  deadline?: string
  candidates: Candidate[]
  participants: Participant[]
  decidedCandidateId?: string
}
