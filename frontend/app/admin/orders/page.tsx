"use client";

import React, { useEffect, useMemo, useState } from "react";
import { apiGetOrders, apiUpdateOrderStatus, type Order } from "@/lib/order-api";
import { Loader2 } from "lucide-react";
import styles from "./orders.module.css";

type BoardColumn = "pending" | "picking" | "out" | "completed";

function toBoardColumn(status: Order["status"]): BoardColumn {
  if (status === "pending") return "pending";
  if (status === "accepted") return "picking";
  if (status === "paid" || status === "shipped") return "out";
  return "completed";
}

function nextStatus(status: Order["status"]): Order["status"] | null {
  if (status === "paid") return "shipped";
  if (status === "shipped") return "delivered";
  return null;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await apiGetOrders(100, 0);
        setOrders(data.orders ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load orders.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const board = useMemo(() => {
    const initial: Record<BoardColumn, Order[]> = {
      pending: [],
      picking: [],
      out: [],
      completed: []
    };

    for (const order of orders) {
      initial[toBoardColumn(order.status)].push(order);
    }

    return initial;
  }, [orders]);

  const updateStatus = async (order: Order, target: Order["status"]) => {
    setBusyId(order.orderId);
    setError(null);

    try {
      const updated = await apiUpdateOrderStatus(order.orderId, target);
      setOrders((prev) => prev.map((o) => (o.orderId === order.orderId ? updated : o)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update order status.");
    } finally {
      setBusyId(null);
    }
  };

  const advanceOrder = async (order: Order) => {
    const target = nextStatus(order.status);
    if (!target) return;
    await updateStatus(order, target);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Orders Command Center</h1>
        <p>Pending orders can be accepted/rejected. Paid orders can be shipped and delivered.</p>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      {loading ? (
        <div className={styles.loading}><Loader2 size={20} className={styles.spin} /> Loading orders...</div>
      ) : (
        <div className={styles.board}>
          <section className={styles.column}>
            <h2>Pending ({board.pending.length})</h2>
            {board.pending.map((order) => (
              <article key={order.orderId} className={styles.card}>
                <p className={styles.id}>{order.orderId}</p>
                <p>Rs. {order.totalAmount.toFixed(2)}</p>
                <small>{new Date(order.createdAt).toLocaleString()}</small>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => updateStatus(order, "accepted")}
                    disabled={busyId === order.orderId}
                  >
                    Accept
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => updateStatus(order, "rejected")}
                    disabled={busyId === order.orderId}
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </section>

          <section className={styles.column}>
            <h2>accepted ({board.picking.length})</h2>
            {board.picking.map((order) => (
              <article key={order.orderId} className={styles.card}>
                <p className={styles.id}>{order.orderId}</p>
                <p>Rs. {order.totalAmount.toFixed(2)}</p>
                <small>{order.items.length} items</small>
                <span style={{ color: "var(--ink-subtle)", fontSize: "0.9rem" }}>Awaiting customer payment</span>
              </article>
            ))}
          </section>

          <section className={styles.column}>
            <h2>Out for Delivery ({board.out.length})</h2>
            {board.out.map((order) => (
              <article key={order.orderId} className={styles.card}>
                <p className={styles.id}>{order.orderId}</p>
                <p>Rs. {order.totalAmount.toFixed(2)}</p>
                <small>{new Date(order.updatedAt).toLocaleString()}</small>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => advanceOrder(order)}
                  disabled={busyId === order.orderId}
                >
                  {order.status === "paid" ? "Mark Shipped" : "Mark Delivered"}
                </button>
              </article>
            ))}
          </section>

          <section className={styles.column}>
            <h2>Completed ({board.completed.length})</h2>
            {board.completed.map((order) => (
              <article key={order.orderId} className={styles.card}>
                <p className={styles.id}>{order.orderId}</p>
                <p>Rs. {order.totalAmount.toFixed(2)}</p>
                <small>{order.status.toUpperCase()}</small>
              </article>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
