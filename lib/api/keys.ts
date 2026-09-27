/** Server Component での prefetch と Client Component の useQuery で共有するクエリキー */
export const movieKeys = {
  all: ['movies'] as const,
}

export const eventKeys = {
  all: ['events'] as const,
  detail: (id: string) => ['events', 'detail', id] as const,
  summaries: (ids: string[]) => ['events', 'summaries', ids] as const,
}
