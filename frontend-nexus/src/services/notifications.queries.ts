import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "./notifications.service";

const NOTIFICATIONS_KEY = ["notifications"] as const;
const UNREAD_COUNT_KEY = ["notifications", "unread-count"] as const;

/** Poll notifications list every 15 s */
export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, { unreadOnly }],
    queryFn: () => getMyNotifications(unreadOnly),
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}

/** Poll unread count every 10 s (lightweight endpoint) */
export function useUnreadCount() {
  return useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: getUnreadCount,
    refetchInterval: 10_000,
    staleTime: 8_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: number) =>
      markNotificationRead(notificationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      qc.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      qc.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}
