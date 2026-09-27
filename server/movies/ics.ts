export type IcsEvent = {
  uid: string
  summary: string
  startDate: string
  description?: string
  url?: string
}

/** RFC 5545 の折り返し（CRLF + 空白/タブ）を解除して論理行に分割する */
function unfoldLines(text: string) {
  return text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)
}

function unescapeText(value: string) {
  return value.replace(/\\([;,nN])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c))
}

/** DTSTART の値（20261002 / 20261002T000000Z）から YYYY-MM-DD を取り出す */
function toIsoDate(value: string) {
  const match = /^(\d{4})(\d{2})(\d{2})/.exec(value)
  return match ? `${match[1]}-${match[2]}-${match[3]}` : undefined
}

export function parseIcs(text: string): IcsEvent[] {
  const events: IcsEvent[] = []
  let current: Record<string, string> | undefined

  for (const line of unfoldLines(text)) {
    if (line === 'BEGIN:VEVENT') {
      current = {}
      continue
    }
    if (line === 'END:VEVENT') {
      const startDate = current?.DTSTART && toIsoDate(current.DTSTART)
      if (current?.UID && startDate) {
        events.push({
          uid: current.UID,
          summary: unescapeText(current.SUMMARY ?? ''),
          startDate,
          description: current.DESCRIPTION ? unescapeText(current.DESCRIPTION) : undefined,
          url: current.URL,
        })
      }
      current = undefined
      continue
    }
    if (!current) continue
    const separator = line.indexOf(':')
    if (separator < 0) continue
    const name = line.slice(0, separator).split(';')[0]?.toUpperCase()
    if (name) current[name] = line.slice(separator + 1)
  }
  return events
}
