import type { NotificationDto } from '@/types/notification'
import api from './index'

export const notificationApi = {
  fetchAll: () => api.get<NotificationDto[]>('/api/notifications').then((r) => r.data),

  markAsRead: (id: number) => api.patch<void>(`/api/notifications/${id}/read`),

  markAllRead: () => api.patch<void>('/api/notifications/read-all'),
}
