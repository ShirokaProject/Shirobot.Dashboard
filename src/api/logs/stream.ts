import type { LogStreamMessage } from './logs'

/** EventSource owns reconnection; closing a page or pausing stops it explicitly. */
export function openLogEventStream(url: string, handlers: {
  message: (message: LogStreamMessage) => void
  open: () => void
  error: () => void
  invalid: () => void
}) {
  const source = new EventSource(url)
  source.onopen = () => handlers.open()
  source.onerror = () => handlers.error()
  source.onmessage = event => {
    let message: LogStreamMessage
    try {
      message = JSON.parse(event.data) as LogStreamMessage
      if (!message || !['connected', 'history', 'logs'].includes(message.type) ||
        (message.type !== 'connected' && !Array.isArray(message.data))) throw new Error('Invalid log event')
    } catch {
      handlers.invalid()
      return
    }
    handlers.message(message)
  }
  return () => {
    source.onopen = null
    source.onmessage = null
    source.onerror = null
    source.close()
  }
}
