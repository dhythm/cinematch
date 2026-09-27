import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { EventSummary, EventView, Movie } from '@/lib/types'
import type { CreateEventInput, SaveParticipantInput } from '@/server/events/event-service'
import { apiFetch } from './client'
import { eventKeys, movieKeys } from './keys'

export const moviesQuery = () =>
  queryOptions({
    queryKey: movieKeys.all,
    queryFn: () => apiFetch<{ movies: Movie[] }>('/api/movies').then((body) => body.movies),
    staleTime: 10 * 60 * 1000,
  })

export const eventQuery = (id: string) =>
  queryOptions({
    queryKey: eventKeys.detail(id),
    queryFn: () => apiFetch<EventView>(`/api/events/${encodeURIComponent(id)}`),
  })

export const eventSummariesQuery = (ids: string[]) =>
  queryOptions({
    queryKey: eventKeys.summaries(ids),
    queryFn: () =>
      apiFetch<{ events: EventSummary[] }>(`/api/events?ids=${ids.map(encodeURIComponent).join(',')}`).then(
        (body) => body.events,
      ),
    enabled: ids.length > 0,
  })

/** 変更系はサーバーが返す集計済みイベントでキャッシュを置き換える（クライアントで再計算しない） */
function useEventMutation<TInput>(eventId: string, request: (input: TInput) => Promise<EventView>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: request,
    onSuccess: (event) => {
      queryClient.setQueryData(eventKeys.detail(eventId), event)
      void queryClient.invalidateQueries({ queryKey: [...eventKeys.all, 'summaries'] })
    },
  })
}

export function useCreateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateEventInput) => apiFetch<EventView>('/api/events', { method: 'POST', json: input }),
    onSuccess: (event) => queryClient.setQueryData(eventKeys.detail(event.id), event),
  })
}

export function useSaveParticipant(eventId: string) {
  return useEventMutation(eventId, (input: SaveParticipantInput) =>
    apiFetch<EventView>(`/api/events/${encodeURIComponent(eventId)}/participants`, { method: 'POST', json: input }),
  )
}

export function useDecide(eventId: string) {
  return useEventMutation(eventId, (candidateId: string) =>
    apiFetch<EventView>(`/api/events/${encodeURIComponent(eventId)}/decision`, {
      method: 'PUT',
      json: { candidateId },
    }),
  )
}

export function useReopen(eventId: string) {
  return useEventMutation(eventId, () =>
    apiFetch<EventView>(`/api/events/${encodeURIComponent(eventId)}/decision`, { method: 'DELETE' }),
  )
}
