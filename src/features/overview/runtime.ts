import type { OverviewRuntime } from '../../api/overview/overview'

const labels: Record<string, string> = {
  docker: 'Docker', podman: 'Podman', containerd: 'containerd', 'cri-o': 'CRI-O',
  gvisor: 'gVisor', kata: 'Kata Containers', container: '容器（引擎未知）',
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
  if (!runtime.mode) return ''
  const parts = [runtime.mode, runtime.container_runtime, runtime.container_host, runtime.orchestrator]
    .filter((value): value is string => Boolean(value))
    .map(value => value.toLowerCase())
  return [...new Set(parts)].map(value => value === 'kubernetes' ? 'Kubernetes' : labels[value] ?? value).join(' · ')
}
