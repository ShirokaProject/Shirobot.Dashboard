import { Box, Connection, Document, InfoFilled, Monitor, Setting } from '@element-plus/icons-vue'

export const menuItems = [
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
    icon: Box,
    count: 4
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
    icon: Document,
    count: 11
  },
  {
    path: '/about',
    label: '关于',
    short: '关于',
    icon: InfoFilled
  }
]
