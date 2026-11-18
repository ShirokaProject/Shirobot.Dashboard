/** Bound bursts before Vue updates, including when a tab is in the background. */
export function createLogBuffer<T>(consume: (entries: T[]) => void, limit = 1000) {
  let pending: T[] = []
  let timer: ReturnType<typeof setTimeout> | undefined

  function flush() {
    clearTimeout(timer)
    timer = undefined
    if (!pending.length) return
    const entries = pending
    pending = []
    consume(entries)
  }

  function clear() {
    clearTimeout(timer)
    timer = undefined
    pending = []
  }

  function enqueue(entries: T[]) {
    if (!entries.length) return
    pending = [...pending, ...entries].slice(-limit)
    timer ??= setTimeout(flush, 16)
  }

  return { enqueue, flush, clear }
}
