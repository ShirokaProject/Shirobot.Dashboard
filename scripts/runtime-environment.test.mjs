import test from 'node:test'
import assert from 'node:assert/strict'
import { describeRunMode, isContainerRuntime } from '../src/features/overview/runtime.ts'

test('runtime labels distinguish engines, sandboxes and desktop hosts', () => {
  assert.equal(describeRunMode({ mode: 'podman' }), 'Podman')
  assert.equal(describeRunMode({ mode: 'docker', container_runtime: 'gvisor', container_host: 'orbstack' }), 'Docker · gVisor · OrbStack')
  assert.equal(describeRunMode({ mode: 'containerd', container_runtime: 'kata', orchestrator: 'kubernetes' }), 'containerd · Kata Containers · Kubernetes')
  for (const [host, label] of Object.entries({ 'wsl-containers': 'WSL Containers', 'apple-container': 'Apple Container', 'docker-desktop': 'Docker Desktop', lima: 'Colima/Lima', colima: 'Colima', 'rancher-desktop': 'Rancher Desktop' })) {
    assert.equal(describeRunMode({ mode: 'docker', container_host: host }), `Docker · ${label}`)
  }
  assert.equal(describeRunMode({ mode: 'apple-container', container_host: 'apple-container' }), 'Apple Container')
  assert.equal(describeRunMode({ mode: 'native', container_host: 'wsl2' }), '直接运行 · WSL2')
  assert.equal(describeRunMode({ mode: 'container' }), '容器（引擎未知）')
  assert.equal(describeRunMode({ mode: 'native' }), '直接运行')
  assert.equal(describeRunMode({ mode: 'systemd' }), 'systemd 服务')
  assert.equal(describeRunMode({ mode: 'future-runtime' }), 'future-runtime')
  assert.equal(describeRunMode({}), '')
})

test('image build label applies to all container engines and remains compatible with older hosts', () => {
  for (const mode of ['docker', 'podman', 'containerd', 'cri-o', 'gvisor', 'kata', 'container', 'apple-container', 'wsl-containers']) {
    assert.equal(isContainerRuntime({ mode }), true, mode)
  }
  assert.equal(isContainerRuntime({ mode: 'native', container_host: 'wsl2' }), false)
  assert.equal(isContainerRuntime({ mode: 'systemd' }), false)
  assert.equal(isContainerRuntime({ mode: 'future-runtime', is_container: true }), true)
})
