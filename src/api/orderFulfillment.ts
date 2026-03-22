import api from './index'

export interface OrderFulfillmentDto {
  salesOrderId: number
  orderNumber: string
  orderDate: string
  deliveryDate: string | null
  partnerName: string
  employeeName: string | null
  orderStatusCode: string
  shipmentId: number | null
  shipmentNumber: string | null
  shipmentStatusCode: string | null
  shipmentDate: string | null
  totalPlannedAmount: number
  totalActualAmount: number | null
  totalOrderAmount: number
  totalRevenueAmount: number
  revenueStatusSummary: string // "없음" | "초안" | "마감" | "혼재"
  fulfillmentRate: number | null // 실제 출하금액 / 수주금액 × 100
}

export interface OrderFulfillmentSearchParams {
  orderNumber?: string
  partnerId?: number
  orderStatusCode?: string
  shipmentStatusCode?: string
  fromDate?: string
  toDate?: string
}

export const orderFulfillmentApi = {
  getAll: (params?: OrderFulfillmentSearchParams) =>
    api.get<OrderFulfillmentDto[]>('/api/order-fulfillment', { params }),
}
