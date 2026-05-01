"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiMarkAsRead, apiUserNotifications, type NotificationDto } from "@/lib/notification";
import { BellRing, CheckCircle2, Package, CreditCard, Info, RefreshCw, Check } from "lucide-react";
import styles from "./notifications.module.css";

const POLL_INTERVAL_MS = 6000;

function getIconForType(type: string) {
  const t = type.toLowerCase();
  if (t.includes("order") || t.includes("ship")) return <Package size={20} />;
  if (t.includes("payment") || t.includes("pay")) return <CreditCard size={20} />;
  if (t.includes("success")) return <CheckCircle2 size={20} />;
  return <BellRing size={20} />;
}

export default function CustomerNotificationsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items]);

  const load = useCallback(async (isManualRefresh = false) => {
    if (!user) return;
    if (isManualRefresh) setRefreshing(true);

    try {
      setError(null);
      const { notifications } = await apiUserNotifications(user._id, { limit: 100, skip: 0 });
      setItems(notifications);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      if (isManualRefresh) {
        setTimeout(() => setRefreshing(false), 500); // UI feel
      }
    }
  }, [user]);

  useEffect(() => {
    void load();
    const id = setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await apiMarkAsRead(id);
    } catch (err) {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)));
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Notifications</h1>
          <p className={styles.subtle}>Stay updated on your orders and payments.</p>
        </div>
        <div className={styles.headerMeta}>
          {unreadCount > 0 && (
            <span className={styles.unreadPill}>
              {unreadCount} New
            </span>
          )}
          <button 
            type="button" 
            className={`btn btn-secondary btn-sm ${styles.refreshBtn}`} 
            onClick={() => void load(true)}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? styles.spin : ""} />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className={styles.errorBox}>
          <Info size={16} /> {error}
        </div>
      ) : null}

      {loading && !refreshing && items.length === 0 ? (
        <div className={styles.emptyState}>
          <RefreshCw size={24} className={styles.spin} />
          <p>Loading your notifications...</p>
        </div>
      ) : null}

      <div className={styles.list}>
        {items.length === 0 && !loading ? (
          <div className={styles.emptyState}>
            <BellRing size={40} className={styles.emptyIcon} />
            <h3>All caught up!</h3>
            <p className={styles.subtle}>You don&apos;t have any notifications yet.</p>
          </div>
        ) : null}

        {items.map((n) => (
          <div key={n.id} className={`${styles.card} ${n.isRead ? "" : styles.unreadCard}`}>
            <div className={styles.iconWrap}>
              {getIconForType(n.type)}
            </div>
            
            <div className={styles.cardContent}>
              <div className={styles.cardTop}>
                <span className={styles.typeTag}>
                  {n.type.replace(/_/g, " ")}
                </span>
                <span className={styles.time}>{new Date(n.createdAt).toLocaleString(undefined, {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}</span>
              </div>
              <p className={styles.message}>{n.message}</p>
            </div>
            
            <div className={styles.cardActions}>
              {!n.isRead ? (
                <button 
                  type="button" 
                  className={styles.markReadBtn} 
                  onClick={() => void markRead(n.id)}
                  title="Mark as read"
                >
                  <Check size={16} />
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
