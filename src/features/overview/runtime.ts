import type { OverviewRuntime } from '../../api/overview/overview'

const labels: Record<string, string> = {
  docker: 'Docker', podman: 'Podman', containerd: 'containerd', 'cri-o': 'CRI-O',
  gvisor: 'gVisor', kata: 'Kata Containers', container: 'Container', kubernetes: 'Kubernetes',
  'apple-container': 'Apple Container', 'wsl-containers': 'WSL Containers',
  orbstack: 'OrbStack', 'docker-desktop': 'Docker Desktop', colima: 'Colima', lima: 'Colima/Lima',
  'rancher-desktop': 'Rancher Desktop', wsl2: 'WSL2', linuxkit: 'LinuxKit',
  lxc: 'LXC', 'systemd-nspawn': 'systemd-nspawn',
  native: '直接运行', systemd: 'systemd 服务', windows_service: 'Windows 服务'
}
const containerModes = new Set([
  'docker', 'podman', 'containerd', 'cri-o', 'gvisor', 'kata', 'container',
  'apple-container', 'wsl-containers', 'lxc', 'systemd-nspawn'
])

export function isContainerRuntime(runtime: OverviewRuntime): boolean {
  return runtime.is_container ?? containerModes.has(runtime.mode?.toLowerCase() ?? '')
}

export function describeRunMode(runtime: OverviewRuntime): string {
  const candidates = [runtime.orchestrator, runtime.container_host, runtime.container_runtime, runtime.container_engine, runtime.mode]
  for (const candidate of candidates) {
    const key = candidate?.trim().toLowerCase()
    if (key && key !== 'container' && labels[key]) return labels[key]!
  }
  return isContainerRuntime(runtime) ? 'Container' : runtime.mode ?? ''
}
