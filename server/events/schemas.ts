import { z } from 'zod'

const isoDate = z.iso.date()
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || undefined)
    .optional()

export const createEventSchema = z.object({
  movieId: z.string().min(1),
  title: z.string().trim().min(1).max(100),
  organizer: optionalText(20),
  memo: optionalText(500),
  deadline: isoDate.optional(),
  dates: z.array(isoDate).min(1).max(31),
  slots: z.array(z.enum(['morning', 'noon', 'evening', 'late'])).min(1),
})

export const saveParticipantSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(20),
  comment: optionalText(200),
  answers: z.record(z.string(), z.enum(['yes', 'maybe', 'no'])),
})

export const decideSchema = z.object({
  candidateId: z.string().min(1),
})
