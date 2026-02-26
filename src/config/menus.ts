import type { Component } from 'vue'
import {
  LayoutDashboard,
  Database,
  Users,
  Package,
  ListOrdered,
  Settings,
} from 'lucide-vue-next'

export interface MenuLeaf {
  type: 'leaf'
  key: string
  label: string
  path: string
  icon?: Component
}

export interface MenuGroup {
  type: 'group'
  key: string
  label: string
  icon?: Component
  children: MenuLeaf[]
}

export type MenuItem = MenuLeaf | MenuGroup

export const menus: MenuItem[] = [
  {
    type: 'leaf',
    key: 'dashboard',
    label: '대시보드',
    path: '/',
    icon: LayoutDashboard,
  },
  {
    type: 'group',
    key: 'master',
    label: '기준정보',
    icon: Database,
    children: [
      {
        type: 'leaf',
        key: 'partner',
        label: '거래처 관리',
        path: '/partner',
        icon: Users,
      },
      {
        type: 'leaf',
        key: 'item',
        label: '품목 관리',
        path: '/item',
        icon: Package,
      },
      {
        type: 'leaf',
        key: 'common-code',
        label: '공통코드 관리',
        path: '/common-code',
        icon: ListOrdered,
      },
    ],
  },
  // 추후 도메인 추가 예시:
  // {
  //   type: 'group',
  //   key: 'production',
  //   label: '생산관리',
  //   icon: Factory,
  //   children: [ ... ],
  // },
  {
    type: 'group',
    key: 'system',
    label: '시스템',
    icon: Settings,
    children: [],
  },
]
