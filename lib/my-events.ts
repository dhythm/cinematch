'use client'

import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'cinematchan:my-event-ids'
const MAX_EVENTS = 20
const EMPTY: string[] = []

const listeners = new Set<() => void>()
let cachedRaw: string | null = null
let cachedIds: string[] = EMPTY

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw !== cachedRaw) {
      cachedRaw = raw
      const parsed: unknown = raw ? JSON.parse(raw) : []
      cachedIds = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : EMPTY
    }
    return cachedIds
  } catch {
    return EMPTY
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

/** 作成・回答したイベントをこのブラウザに記録する（アカウント導入までの暫定） */
export function rememberEvent(id: string) {
  const ids = [id, ...read().filter((existing) => existing !== id)].slice(0, MAX_EVENTS)
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    return
  }
  for (const listener of listeners) listener()
}

export function useMyEventIds() {
  return useSyncExternalStore(subscribe, read, () => EMPTY)
}
