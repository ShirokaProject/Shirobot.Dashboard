import assert from 'node:assert/strict'
import test from 'node:test'
import { createLogBuffer } from '../src/features/logs/buffer.ts'
import { openLogEventStream } from '../src/api/logs/stream.ts'

test('bursts are coalesced in order with a bounded backlog and clear cancels pending output', () => {
  const frames = []
  const buffer = createLogBuffer(entries => frames.push(entries), 1000)
  for (let i = 0; i < 2000; i++) buffer.enqueue([i])
  assert.equal(frames.length, 0)
  buffer.flush()
  assert.deepEqual(frames, [Array.from({ length: 1000 }, (_, i) => i + 1000)])
  buffer.enqueue([2000])
  buffer.clear()
  buffer.flush()
  assert.equal(frames.length, 1)
})

test('a lone log is delivered without waiting for another message', async () => {
  const entries = await new Promise(resolve => {
    const buffer = createLogBuffer(resolve)
    buffer.enqueue(['single'])
  })
  assert.deepEqual(entries, ['single'])
})

test('SSE supports history, reconnect errors, malformed data and explicit shutdown', t => {
  let instance
  const previous = globalThis.EventSource
  globalThis.EventSource = class {
    constructor(url) { this.url = url; instance = this }
    close() { this.closed = true }
  }
  t.after(() => { globalThis.EventSource = previous })
  const messages = []
  let opened = 0, errors = 0, invalid = 0
  const stop = openLogEventStream('https://host/api/v1/logs/stream?token=test', {
    message: message => messages.push(message),
    open: () => opened++, error: () => errors++, invalid: () => invalid++
  })
  instance.onopen()
  instance.onmessage({ data: JSON.stringify({ type: 'history', data: ['old'] }) })
  instance.onerror()
  instance.onopen()
  instance.onmessage({ data: JSON.stringify({ type: 'history', data: ['reconnected'] }) })
  instance.onmessage({ data: JSON.stringify({ type: 'logs', data: ['live'] }) })
  instance.onmessage({ data: 'bad json' })
  instance.onmessage({ data: JSON.stringify({ type: 'logs' }) })
  assert.equal(opened, 2)
  assert.equal(errors, 1)
  assert.equal(invalid, 2)
  assert.deepEqual(messages.map(message => message.data), [['old'], ['reconnected'], ['live']])
  stop()
  assert.equal(instance.closed, true)
  assert.equal(instance.onmessage, null)
  assert.equal(instance.onerror, null)
})
