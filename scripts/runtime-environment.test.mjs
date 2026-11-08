import test from 'node:test'
import assert from 'node:assert/strict'
import { describeRunMode, isContainerRuntime } from '../src/features/overview/runtime.ts'

test('runtime label shows only the last identified environment', () => {
  assert.equal(describeRunMode({ mode: 'podman' }), 'Podman')
  assert.equal(describeRunMode({ mode: 'docker', container_runtime: 'gvisor', container_host: 'orbstack' }), 'OrbStack')
  assert.equal(describeRunMode({ mode: 'containerd', container_runtime: 'kata' }), 'Kata Containers')
  assert.equal(describeRunMode({ mode: 'containerd', container_runtime: 'kata', orchestrator: 'kubernetes' }), 'Kubernetes')
  for (const [host, label] of Object.entries({ 'wsl-containers': 'WSL Containers', 'apple-container': 'Apple Container', 'docker-desktop': 'Docker Desktop', lima: 'Colima/Lima', colima: 'Colima', 'rancher-desktop': 'Rancher Desktop' })) {
    assert.equal(describeRunMode({ mode: 'docker', container_host: host }), label)
  }
  assert.equal(describeRunMode({ mode: 'apple-container', container_host: 'apple-container' }), 'Apple Container')
  assert.equal(describeRunMode({ mode: 'native', container_host: 'wsl2' }), 'WSL2')
  assert.equal(describeRunMode({ mode: 'container' }), 'Container')
  assert.equal(describeRunMode({ is_container: true }), 'Container')
  assert.equal(describeRunMode({ mode: 'container', container_engine: 'podman' }), 'Podman')
  assert.equal(describeRunMode({ mode: 'unknown', is_container: true, container_host: 'unrecognized' }), 'Container')
  assert.equal(describeRunMode({ mode: 'docker', container_host: 'unrecognized' }), 'Docker')
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
