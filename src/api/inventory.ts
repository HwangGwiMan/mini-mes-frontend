import api from './index'

// ── Response DTOs ────────────────────────────────────────────────────────────

export interface InventoryDto {
  warehouseId: number
  itemId: number
  itemCode: string
  itemName: string
  qtyOnHand: number
  qtyReserved: number
  availableQty: number
}

export interface InventoryLotDto {
  warehouseId: number
  itemId: number
  itemCode: string
  itemName: string
  lotNo: string
  qtyOnHand: number
  qtyReserved: number
  availableQty: number
  expiryDate: string | null
}

export type InventoryTxType =
  | 'PURCHASE_IN'
  | 'MATERIAL_RESERVE'
  | 'MATERIAL_UNRESERVE'
  | 'PRODUCTION_OUT'
  | 'PRODUCTION_IN'
  | 'SALES_OUT'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'ADJUST_IN'
  | 'ADJUST_OUT'

export interface InventoryTxDto {
  id: number
  warehouseId: number
  itemId: number
  itemCode: string
  itemName: string
  lotNo: string | null
  txType: InventoryTxType
  qtyDelta: number
  refType: string | null
  refId: number | null
  txDate: string
  createdAt: string
  createdBy: string
}

// ── Request shapes ───────────────────────────────────────────────────────────

export interface InventorySearchParams {
  warehouseId?: number
  itemId?: number
}

export interface InventoryTxSearchParams {
  warehouseId?: number
  itemId?: number
  fromDate?: string
  toDate?: string
}

export interface TransferRequest {
  fromWarehouseId: number
  toWarehouseId: number
  itemId: number
  lotNo?: string
  qty: number
}

export interface AdjustRequest {
  warehouseId: number
  itemId: number
  lotNo?: string
  qty: number
  txType: 'ADJUST_IN' | 'ADJUST_OUT'
}

// ── 거래 유형 한글 라벨 ───────────────────────────────────────────────────────
// 컴포넌트 여러 곳에서 공통으로 import해서 사용 — 라벨 변경 시 이 파일만 수정하면 됨

export const TX_TYPE_LABELS: Record<InventoryTxType, string> = {
  PURCHASE_IN: '구매 입고',
  MATERIAL_RESERVE: '자재 예약',
  MATERIAL_UNRESERVE: '자재 예약 취소',
  PRODUCTION_OUT: '생산 출고',
  PRODUCTION_IN: '생산 입고',
  SALES_OUT: '판매 출고',
  TRANSFER_OUT: '이동 출고',
  TRANSFER_IN: '이동 입고',
  ADJUST_IN: '조정 입고',
  ADJUST_OUT: '조정 출고',
}

// ── API service ──────────────────────────────────────────────────────────────

export const inventoryApi = {
  /** 현재고: 창고+품목 기준 집계 */
  getStock: (params?: InventorySearchParams) =>
    api.get<InventoryDto[]>('/api/inventory', { params }),

  /** LOT별 현재고 */
  getLots: (params?: InventorySearchParams) =>
    api.get<InventoryLotDto[]>('/api/inventory/lots', { params }),

  /** 수불 이력 — 날짜 범위 지정 권장 (미지정 시 전체 조회로 성능 저하 가능) */
  getTransactions: (params?: InventoryTxSearchParams) =>
    api.get<InventoryTxDto[]>('/api/inventory/transactions', { params }),

  /** 창고 간 재고 이동 */
  transfer: (data: TransferRequest) => api.post<void>('/api/inventory/transfer', data),

  /** 재고 조정 (ADJUST_IN: 증가 / ADJUST_OUT: 감소) */
  adjust: (data: AdjustRequest) => api.post<void>('/api/inventory/adjust', data),
}
