import assert from 'node:assert/strict'
import test from 'node:test'
import { computed, ref } from 'vue'
import { findPluginMarketEntry, withPluginUpdate, compareVersions } from '../src/features/plugins/updates.ts'

const plugin = { id: 'JmParser', repo: 'https://github.com/greepar/ShiroBot.Plugin.JmParser.git/', version: '1.3.0', status: 'enabled', hasUpdate: false }
const entry = { id: 'jm-parser', repository: 'greepar/ShiroBot.Plugin.JmParser', release: { version: '1.3.2' } }

test('market arrival and installed version refresh update an already selected plugin', () => {
  const selected = ref(plugin)
  const entries = ref([])
  const detail = computed(() => withPluginUpdate(selected.value, entries.value))
  assert.equal(detail.value.hasUpdate, false)
  entries.value = [entry]
  assert.equal(detail.value.hasUpdate, true)
  assert.equal(detail.value.latestVersion, '1.3.2')
  selected.value = { ...plugin, version: '1.3.2' }
  assert.equal(detail.value.hasUpdate, false)
})

test('repository matching tolerates casing, GitHub URLs, .git and differing market IDs', () => {
  assert.equal(findPluginMarketEntry({ ...plugin, repo: plugin.repo.toUpperCase() }, [entry]), entry)
  assert.equal(findPluginMarketEntry({ ...plugin, repo: undefined }, [{ ...entry, id: 'jmparser' }])?.id, 'jmparser')
  assert.equal(findPluginMarketEntry(plugin, [{ ...entry, id: plugin.id, repository: 'another/plugin' }]), null)
})

test('updates remain visible for disabled and incompatible plugins without changing their status', () => {
  for (const status of ['disabled', 'error']) {
    const result = withPluginUpdate({ ...plugin, status }, [entry])
    assert.equal(result.hasUpdate, true)
    assert.equal(result.status, status)
  }
})

test('equal, older and unresolved releases do not offer an update', () => {
  for (const version of ['v1.3.0', '1.2.9', null]) {
    assert.equal(withPluginUpdate(plugin, [{ ...entry, release: { version } }]).hasUpdate, false)
  }
  assert.ok(compareVersions('1.10.0', '1.9.0') > 0)
  assert.ok(compareVersions('1.3.0', '1.3.0-rc.1') > 0)
})
