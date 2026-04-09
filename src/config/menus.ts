import type { Component } from 'vue'
import {
  LayoutDashboard,
  Database,
  Users,
  UserRound,
  Package,
  ListOrdered,
  Workflow,
  ShoppingCart,
  FileText,
  ClipboardList,
  DollarSign,
  PackageCheck,
  TrendingUp,
  BarChart3,
  Settings,
  Layers,
  GitMerge,
  ShoppingBag,
  ClipboardCheck,
  Warehouse,
  FileSpreadsheet,
  PackageOpen,
  Archive,
  PackageSearch,
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
        key: 'process',
        label: '공정 관리',
        path: '/process',
        icon: Workflow,
      },
      {
        type: 'leaf',
        key: 'employee',
        label: '사원 관리',
        path: '/employee',
        icon: UserRound,
      },
      {
        type: 'leaf',
        key: 'common-code',
        label: '공통코드 관리',
        path: '/common-code',
        icon: ListOrdered,
      },
      {
        type: 'leaf',
        key: 'bom',
        label: 'BOM 관리',
        path: '/bom',
        icon: Layers,
      },
      {
        type: 'leaf',
        key: 'routing',
        label: '라우팅 관리',
        path: '/routing',
        icon: GitMerge,
      },
      {
        type: 'leaf',
        key: 'warehouse',
        label: '창고 관리',
        path: '/warehouse',
        icon: Warehouse,
      },
    ],
  },
  {
    type: 'group',
    key: 'sales',
    label: '영업 관리',
    icon: ShoppingCart,
    children: [
      { type: 'leaf', key: 'quote', label: '견적 관리', path: '/quote', icon: FileText },
      { type: 'leaf', key: 'order', label: '수주 관리', path: '/order', icon: ClipboardList },
      { type: 'leaf', key: 'price', label: '단가 관리', path: '/price', icon: DollarSign },
      { type: 'leaf', key: 'shipment', label: '출하 관리', path: '/shipment', icon: PackageCheck },
      { type: 'leaf', key: 'revenue', label: '매출 관리', path: '/revenue', icon: TrendingUp },
      { type: 'leaf', key: 'order-fulfillment', label: '수주 이행 현황', path: '/order-fulfillment', icon: BarChart3 },
    ],
  },
  {
    type: 'group',
    key: 'purchase',
    label: '구매 관리',
    icon: ShoppingBag,
    children: [
      {
        type: 'leaf',
        key: 'purchase-request',
        label: '구매 요청',
        path: '/purchase-request',
        icon: ClipboardCheck,
      },
      {
        type: 'leaf',
        key: 'purchase-order',
        label: '구매 발주',
        path: '/purchase-order',
        icon: FileSpreadsheet,
      },
      {
        type: 'leaf',
        key: 'goods-receipt',
        label: '자재 입고',
        path: '/goods-receipt',
        icon: PackageOpen,
      },
    ],
  },
  {
    type: 'group',
    key: 'inventory',
    label: '재고 관리',
    icon: Archive,
    children: [
      {
        type: 'leaf',
        key: 'inventory',
        label: '재고 원장',
        path: '/inventory',
        icon: PackageSearch,
      },
    ],
  },
  {
    type: 'group',
    key: 'system',
    label: '시스템',
    icon: Settings,
    children: [],
  },
]
