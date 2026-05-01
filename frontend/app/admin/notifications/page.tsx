"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiAdminNotifications, apiMarkAsRead, type NotificationDto } from "@/lib/notification";
import styles from "./notifications.module.css";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, 
  Package, 
  User, 
  CreditCard, 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle,
  Clock,
  Check
} from "lucide-react";

const POLL_INTERVAL_MS = 5000;

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "inventory":
      return <Package size={20} />;
    case "user":
      return <User size={20} />;
    case "payment":
      return <CreditCard size={20} />;
    default:
      return <Bell size={20} />;
  }
};

export default function AdminNotificationsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationDto[]>([]);

  const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { notifications } = await apiAdminNotifications({ limit: 50, skip: 0 });
      setItems(notifications);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  const markRead = useCallback(async (id: string) => {
    // optimistic
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await apiMarkAsRead(id);
    } catch (err) {
      // rollback on error
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)));
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  if (user?.role !== "admin") {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Notifications</h1>
        <p className={styles.subtle}>Admin access required.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Notifications</h1>
          <p className={styles.subtle}>Real-time updates from your marketplace.</p>
        </div>
        <div className={styles.headerMeta}>
          {unreadCount > 0 && (
            <motion.span 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={styles.unreadPill}
            >
              {unreadCount} New
            </motion.span>
          )}
          <button 
            type="button" 
            className="btn btn-secondary btn-sm d-flex align-items-center gap-2" 
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={styles.errorBox}
          >
            <div className="d-flex align-items-center gap-2">
              <AlertCircle size={20} />
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.list}>
        {items.length === 0 && !loading ? (
          <div className="text-center py-5">
            <Bell size={48} className="text-muted mb-3 opacity-20" />
            <p className={styles.subtle}>Your inbox is empty.</p>
          </div>
        ) : null}

        <AnimatePresence initial={false}>
          {items.map((n, index) => (
            <motion.div 
              key={n.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`${styles.card} ${n.isRead ? "" : styles.unreadCard} ${styles[`type_${n.type}`]}`}
            >
              <div className={styles.cardTop}>
                <div className={styles.cardHeader}>
                  <div className={styles.iconWrapper}>
                    {getNotificationIcon(n.type)}
                  </div>
                  <span className={styles.typeTag}>{n.type}</span>
                </div>
                <div className={styles.time}>
                  <Clock size={12} className="me-1 d-inline" />
                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              
              <p className={styles.message}>{n.message}</p>
              
              <div className={styles.cardActions}>
                {!n.isRead ? (
                  <button 
                    type="button" 
                    className={styles.markReadBtn} 
                    onClick={() => void markRead(n.id)}
                  >
                    <Check size={16} />
                    Mark as read
                  </button>
                ) : (
                  <span className={styles.readHint}>
                    <CheckCircle2 size={16} className="text-success" />
                    Seen
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
