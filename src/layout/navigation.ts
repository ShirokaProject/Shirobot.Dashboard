import { Box, Connection, Document, InfoFilled, Monitor, Setting } from '@element-plus/icons-vue'

export const menuItems = [
  {
    path: '/',
    label: '概览',
    short: '概览',
    icon: Monitor
  },
  {
    path: '/plugins',
    label: '插件管理',
    short: '插件',
    icon: Box,
    count: 4
  },
  {
    path: '/plugin-market',
    label: '插件市场',
    short: '市场',
    icon: Box
  },
  {
    path: '/adapters',
    label: '适配器管理',
    short: '适配器',
    icon: Connection
  },
  {
    path: '/logs',
    label: '运行日志',
    short: '日志',
    icon: Document,
    count: 11
  },
  {
    path: '/config',
    label: '配置中心',
    short: '配置',
    icon: Setting
  },
  {
    path: '/about',
    label: '关于',
    short: '关于',
    icon: InfoFilled
  }
]
