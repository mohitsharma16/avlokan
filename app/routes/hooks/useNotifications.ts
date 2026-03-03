import { useState, useEffect, useCallback } from "react";
import type PocketBase from "pocketbase";
import type { Notification } from "../types";

interface UseNotificationsProps {
    pb: PocketBase;
    userId: string | null;
}

export function useNotifications({ pb, userId }: UseNotificationsProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const unreadCount = notifications.filter((n) => !n.read).length;

    // Fetch all notifications for the current user
    const fetchNotifications = useCallback(async () => {
        if (!userId) return;
        try {
            const res = await pb.collection("notifications").getFullList({
                filter: `userId = "${userId}"`,
                sort: "-created",
                requestKey: null,
            });
            setNotifications(res as unknown as Notification[]);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    }, [userId, pb]);

    // Initial fetch
    useEffect(() => {
        if (userId) {
            fetchNotifications();
        }
    }, [userId, fetchNotifications]);

    // Realtime subscription for notifications
    useEffect(() => {
        if (!userId) return;

        let unsubscribe: (() => Promise<void>) | null = null;

        pb.collection("notifications")
            .subscribe("*", (data: any) => {
                const record = data.record;
                // Only process events for this user
                if (record.userId !== userId) return;

                switch (data.action) {
                    case "create":
                        setNotifications((prev) => {
                            if (prev.some((n) => n.id === record.id)) return prev;
                            return [record as unknown as Notification, ...prev];
                        });
                        break;
                    case "update":
                        setNotifications((prev) =>
                            prev.map((n) =>
                                n.id === record.id ? (record as unknown as Notification) : n
                            )
                        );
                        break;
                    case "delete":
                        setNotifications((prev) => prev.filter((n) => n.id !== record.id));
                        break;
                }
            })
            .then((unsub: () => Promise<void>) => {
                unsubscribe = unsub;
            })
            .catch((err: any) => {
                console.error("Error subscribing to notifications:", err);
            });

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [userId, pb]);

    // Mark a single notification as read
    const markAsRead = useCallback(
        async (notificationId: string) => {
            try {
                await pb.collection("notifications").update(notificationId, {
                    read: true,
                }, { requestKey: null });
                setNotifications((prev) =>
                    prev.map((n) =>
                        n.id === notificationId ? { ...n, read: true } : n
                    )
                );
            } catch (error) {
                console.error("Error marking notification as read:", error);
            }
        },
        [pb]
    );

    // Mark all notifications as read
    const markAllAsRead = useCallback(async () => {
        try {
            const unread = notifications.filter((n) => !n.read);
            await Promise.all(
                unread.map((n) =>
                    pb.collection("notifications").update(n.id, {
                        read: true,
                    }, { requestKey: null })
                )
            );
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    }, [pb, notifications]);

    return {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        fetchNotifications,
    };
}
