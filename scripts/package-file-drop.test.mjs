import assert from 'node:assert/strict'
import test from 'node:test'
import { packageFileDropHandlers, packageFileError } from '../src/features/packages/fileDrop.ts'

const dll = new File(['loadable assembly fixture'], 'Plugin.DLL')
const zip = new File(['archive fixture'], 'Adapter.zip')
function drag(type, files = [dll], types = ['Files']) {
  const event = new Event(type, { cancelable: true })
  event.dataTransfer = { types, files, dropEffect: 'none' }
  return event
}

test('page DLL and ZIP drops prevent navigation and reach the upload flow once', () => {
  let hovering = false
  const accepted = []
  const handlers = packageFileDropHandlers({ busy: () => false, hover: v => { hovering = v }, drop: files => accepted.push(files) })
  handlers.dragenter(drag('dragenter'))
  handlers.dragenter(drag('dragenter'))
  handlers.dragleave(drag('dragleave'))
  assert.equal(hovering, true)
  for (const file of [dll, zip]) {
    const event = drag('drop', [file])
    handlers.drop(event)
    assert.equal(event.defaultPrevented, true)
  }
  assert.equal(hovering, false)
  assert.deepEqual(accepted, [[dll], [zip]])
})

test('busy or widget-handled drops do not start a second upload; text is left alone', () => {
  let busy = true
  let calls = 0
  const handlers = packageFileDropHandlers({ busy: () => busy, hover: () => {}, drop: () => calls++ })
  const event = drag('drop')
  handlers.drop(event)
  assert.equal(event.defaultPrevented, true)
  busy = false
  const handled = drag('drop')
  handled.preventDefault()
  handlers.drop(handled)
  const text = drag('drop', [], ['text/plain'])
  handlers.drop(text)
  assert.equal(text.defaultPrevented, false)
  assert.equal(calls, 0)
})

test('plugin and adapter uploads reject multiple, unsupported, empty and oversized files', () => {
  assert.equal(packageFileError([dll]), null)
  assert.equal(packageFileError([zip], '适配器'), null)
  for (const files of [[], [dll, zip], [new File(['text'], 'readme.txt')], [new File([], 'empty.dll')], [{ name: 'big.dll', size: 100 * 1024 * 1024 + 1 }]]) {
    assert.ok(packageFileError(files))
    assert.ok(packageFileError(files, '适配器'))
  }
})
