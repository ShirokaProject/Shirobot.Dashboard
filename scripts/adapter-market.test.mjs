import assert from 'node:assert/strict'
import test from 'node:test'
import { computed, ref } from 'vue'
import { findAdapterMarketEntry } from '../src/features/adapters/market.ts'

const adapter = { id: 'instance', packageId: 'milky', version: '2.2.4' }
const entry = { id: 'Milky', repository: 'ShirokaProject/ShiroBot.Adapter.Milky' }

test('installed adapter details gain repository metadata when the catalog arrives', () => {
  const entries = ref([])
  const detail = computed(() => findAdapterMarketEntry(adapter, entries.value))
  assert.equal(detail.value, null)
  entries.value = [entry]
  assert.equal(detail.value.repository, entry.repository)
})

test('adapter matching uses package ID for instances and tolerates ID casing', () => {
  assert.equal(findAdapterMarketEntry(adapter, [entry]), entry)
  assert.equal(findAdapterMarketEntry({ id: 'milky' }, [entry]), entry)
})

test('repository identity matches differing IDs and avoids linking unrelated packages', () => {
  const local = { ...adapter, repository: 'https://github.com/ShirokaProject/ShiroBot.Adapter.Milky.git/' }
  assert.equal(findAdapterMarketEntry(local, [{ ...entry, id: 'different' }])?.id, 'different')
  assert.equal(findAdapterMarketEntry(local, [{ ...entry, repository: 'someone/other' }]), null)
})
