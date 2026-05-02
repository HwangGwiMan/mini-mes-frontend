export type NotificationType =
  | 'QUOTE_SUBMITTED'
  | 'QUOTE_APPROVED'
  | 'QUOTE_REJECTED'
  | 'PO_CREATED_FROM_PR'
  | 'PO_CANCELLED'
  | 'GOODS_RECEIPT_CONFIRMED'

export interface NotificationDto {
  id: number
  type: NotificationType
  message: string
  referenceId: number | null
  isRead: boolean
  createdAt: string
}
