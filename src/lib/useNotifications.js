import { useState, useEffect, useCallback, useRef } from "react";
import * as db from "./db";

const POLL_MS = 30000;

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const refetch = useCallback(async () => {
    try {
      const [list, count] = await Promise.all([
        db.fetchNotifications({ limit: 50 }),
        db.getUnreadNotificationCount(),
      ]);
      if (!mounted.current) return;
      setNotifications(list);
      setUnreadCount(count);
      setError(null);
    } catch (err) {
      if (!mounted.current) return;
      setError(err.message || "Failed to load notifications");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  const refetchCount = useCallback(async () => {
    try {
      const c = await db.getUnreadNotificationCount();
      if (mounted.current) setUnreadCount(c);
    } catch {
      // soft fail — keep last known count
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  // Poll the unread count every 30s while the tab is visible.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") refetchCount();
    };
    const id = setInterval(tick, POLL_MS);
    const onVis = () => { if (document.visibilityState === "visible") refetchCount(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [refetchCount]);

  const markRead = useCallback(async (id) => {
    setNotifications(prev => prev.map(n => n.id === id && !n.is_read
      ? { ...n, is_read: true, read_at: new Date().toISOString() } : n));
    setUnreadCount(c => Math.max(0, c - 1));
    try {
      await db.markNotificationRead(id);
    } catch {
      // best-effort; a refetch will reconcile
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => n.is_read ? n
      : { ...n, is_read: true, read_at: new Date().toISOString() }));
    setUnreadCount(0);
    try {
      await db.markAllNotificationsRead();
    } catch {
      // best-effort
    }
  }, []);

  return { notifications, unreadCount, loading, error, refetch, markRead, markAllRead };
}
