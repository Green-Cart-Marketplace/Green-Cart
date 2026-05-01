import { getEnvOrThrow } from "../config/env.js";

export type InventoryOrderStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "paid"
  | "failed"
  | "cancelled"
  | "shipped"
  | "delivered";

export interface InventoryOrderDto {
  orderId: string;
  customerId: string;
  totalAmount: number;
  currency: string;
  status: InventoryOrderStatus;
  transactionId?: string;
  payHereId?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

export class InventoryClientService {
  async getOrderInternal(orderId: string): Promise<InventoryOrderDto> {
    const env = getEnvOrThrow();
    const baseUrl = env.INVENTORY_SERVICE_URL.replace(/\/$/, "");

    const res = await fetch(`${baseUrl}/internal/orders/${encodeURIComponent(orderId)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": env.INTERNAL_API_KEY,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Inventory internal getOrder failed (${res.status}): ${text || res.statusText}`);
    }

    return (await res.json()) as InventoryOrderDto;
  }

  async updateOrderPaymentInternal(params: {
    orderId: string;
    status: "paid" | "failed";
    transactionId?: string;
    payHereId?: string;
  }): Promise<InventoryOrderDto> {
    const env = getEnvOrThrow();
    const baseUrl = env.INVENTORY_SERVICE_URL.replace(/\/$/, "");

    const res = await fetch(`${baseUrl}/internal/orders/${encodeURIComponent(params.orderId)}/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": env.INTERNAL_API_KEY,
      },
      body: JSON.stringify({
        status: params.status,
        transactionId: params.transactionId,
        payHereId: params.payHereId,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Inventory internal payment update failed (${res.status}): ${text || res.statusText}`);
    }

    return (await res.json()) as InventoryOrderDto;
  }
}

export const inventoryClientService = new InventoryClientService();
