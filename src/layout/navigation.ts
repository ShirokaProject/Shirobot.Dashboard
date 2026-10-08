import { computed } from 'vue'
import { adapterUpdateCount, hostUpdateCount, pluginUpdateCount } from '../features/plugins/updateCounts'
import type { Component } from 'vue'
import { Box, Connection, Document, InfoFilled, Monitor, Setting } from '@element-plus/icons-vue'

export interface MenuItem {
  path: string
  label: string
  short: string
  icon: Component
  /** Optional badge; leave unset unless it shows a real, live number */
  count?: number
}

export const menuItems: MenuItem[] = [
  {
    path: '/',
    label: '概览',
    short: '概览',
    icon: Monitor
  },
  {
    // 已安装 + 发现 (the former 插件市场) live on one page as tabs
    path: '/plugins',
    label: '插件',
    short: '插件',
    icon: Box
  },
  {
    // 已安装 + 发现 (the former Adapter 市场) live on one page as tabs
    path: '/adapters',
    label: '适配器',
    short: '适配器',
    icon: Connection
  },
  {
    path: '/config',
    label: '配置中心',
    short: '配置',
    icon: Setting
  },
  {
    path: '/logs',
    label: '运行日志',
    short: '日志',
    icon: Document
  },
  {
    path: '/about',
    label: '关于',
    short: '关于',
    icon: InfoFilled
  }
]

export const navigationItems = computed(() => menuItems.map(item => ({
  ...item,
  count: item.path === '/plugins' ? pluginUpdateCount.value
    : item.path === '/adapters' ? adapterUpdateCount.value : item.path === '/about' ? hostUpdateCount.value : item.count
})))
