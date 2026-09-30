"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { createClient } from "@/lib/client";

export interface NotificationItem {
  id: string;
  user_id: string;
  booking_id?: string | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell({
  userId,
  dashboardHref = "/dashboard",
  onNewBooking,
}: {
  userId: string;
  dashboardHref?: string;
  onNewBooking?: (notification: NotificationItem) => void;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const readStateRef = useRef(new Map<string, boolean>());
  const [panelPosition, setPanelPosition] = useState<{ top: number; right: number } | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success) {
        const nextNotifications = (data.notifications || []) as NotificationItem[];
        readStateRef.current = new Map(nextNotifications.map((notification) => [notification.id, notification.is_read]));
        setNotifications(nextNotifications);
        setUnreadCount(nextNotifications.filter((notification) => !notification.is_read).length);
      }
    } catch (err) {
      console.warn("[NotificationBell] Failed to fetch notifications:", err);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const supabase = createClient();
    const channelName = `notifications-${userId}`;

    const startRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      if (!session?.access_token) {
        await fetchNotifications();
        return;
      }

      supabase.realtime.setAuth(session.access_token);
      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          ({ new: record }) => {
            const notification = record as NotificationItem;
            if (!active || notification.user_id !== userId || readStateRef.current.has(notification.id)) return;
            readStateRef.current.set(notification.id, notification.is_read);
            setNotifications((previous) => [notification, ...previous.filter((item) => item.id !== notification.id)].slice(0, 50));
            if (!notification.is_read) setUnreadCount((count) => count + 1);
            if (notification.type === "booking_new") onNewBooking?.(notification);
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          ({ new: record }) => {
            const notification = record as NotificationItem;
            if (!active || notification.user_id !== userId) return;
            const previousRead = readStateRef.current.get(notification.id);
            readStateRef.current.set(notification.id, notification.is_read);
            if (previousRead === false && notification.is_read) setUnreadCount((count) => Math.max(0, count - 1));
            if (previousRead === true && !notification.is_read) setUnreadCount((count) => count + 1);
            setNotifications((previous) => previous.some((item) => item.id === notification.id)
              ? previous.map((item) => item.id === notification.id ? notification : item)
              : [notification, ...previous].slice(0, 50));
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            void fetchNotifications();
          }
        });

      return channel;
    };

    let channel: Awaited<ReturnType<typeof startRealtime>>;
    void startRealtime().then((createdChannel) => {
      if (!createdChannel) return;
      if (!active) {
        void supabase.removeChannel(createdChannel);
        return;
      }
      channel = createdChannel;
    }).catch((err) => {
      console.warn("[NotificationBell] Realtime setup failed; polling will reconcile:", err);
      void fetchNotifications();
    });

    void fetchNotifications();
    const interval = window.setInterval(() => void fetchNotifications(), 60000);
    return () => {
      active = false;
      window.clearInterval(interval);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [fetchNotifications, onNewBooking, userId]);

  const updatePanelPosition = useCallback(() => {
    const bounds = buttonRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const panelMaxHeight = Math.min(420, window.innerHeight - 24);
    setPanelPosition({
      top: Math.max(8, Math.min(bounds.bottom + 8, window.innerHeight - panelMaxHeight - 8)),
      right: Math.max(8, window.innerWidth - bounds.right),
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [isOpen, updatePanelPosition]);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (!dropdownRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      // Optimistic update
      const notification = notifications.find((item) => item.id === id);
      if (!notification || notification.is_read) return;
      readStateRef.current.set(id, true);
      setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
      setUnreadCount((prev) => Math.max(0, prev - 1));

      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) await fetchNotifications();
    } catch (err) {
      console.error("[NotificationBell] Error marking as read:", err);
      await fetchNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      readStateRef.current = new Map(notifications.map((notification) => [notification.id, true]));
      setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })));
      setUnreadCount(0);

      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      if (!response.ok) await fetchNotifications();
    } catch (err) {
      console.error("[NotificationBell] Error marking all as read:", err);
      await fetchNotifications();
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "booking_new":
        return "🚀";
      case "booking_confirmed":
        return "✅";
      case "booking_rejected":
        return "❌";
      case "booking_cancelled":
        return "🚫";
      case "booking_completed":
        return "🎉";
      default:
        return "🔔";
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        ref={buttonRef}
        id="notification-bell-btn"
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) void fetchNotifications();
        }}
        className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-cyan-400"
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-[10px] font-black text-white shadow-md animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && panelPosition && typeof document !== "undefined" && createPortal(
        <div
          ref={panelRef}
          style={{ top: panelPosition.top, right: panelPosition.right, maxHeight: "min(420px, calc(100dvh - 16px))" }}
          className="fixed z-[60] flex w-[min(24rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#120b22] shadow-2xl shadow-black/80 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="min-h-0 overflow-y-auto divide-y divide-white/5">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-xs font-medium">
                <div className="text-3xl mb-2 opacity-50">🔔</div>
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <article
                  key={n.id}
                  className={`p-3.5 flex items-start gap-3 transition-colors hover:bg-white/5 ${!n.is_read ? "bg-white/[0.04]" : "opacity-80"
                    }`}
                >
                  <button type="button" onClick={() => void handleMarkAsRead(n.id)} aria-label={`Mark ${n.title} as read`} className="text-xl shrink-0 p-1.5 rounded-xl bg-white/5 border border-white/10">
                    {getIcon(n.type)}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="text-xs font-bold text-white truncate">
                        {n.title}
                      </div>
                      <span className="text-[10px] text-zinc-400 shrink-0">
                        {formatTime(n.created_at)}
                      </span>
                    </div>
                    <p className="whitespace-pre-line text-xs leading-relaxed font-normal text-zinc-300">
                      {n.message}
                    </p>
                    {n.booking_id && (
                      <Link
                        href={`${dashboardHref}#booking-${n.booking_id}`}
                        onClick={() => {
                          if (!n.is_read) void handleMarkAsRead(n.id);
                          setIsOpen(false);
                        }}
                        className="mt-2 inline-flex min-h-8 items-center text-xs font-bold text-cyan-300 hover:text-white"
                      >
                        View Booking →
                      </Link>
                    )}
                  </div>
                  {!n.is_read && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 mt-1.5 shadow-[0_0_8px_#22d3ee]" />
                  )}
                </article>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
