import { env } from "../config/env";

export type NotificationEventType =
    | "ITEM_CREATED"
    | "ITEM_UPDATED"
    | "ITEM_DELETED"
    | "CART_ITEM_ADDED"
    | "CART_ITEM_REMOVED"
    | "ORDER_CREATED"
    | "ORDER_ACCEPTED"
    | "ORDER_REJECTED";

export async function emitNotificationEvent(eventType: NotificationEventType, data: Record<string, unknown>): Promise<void> {
    if (!env.INTERNAL_API_KEY) {
        return;
    }

    const baseUrl = env.NOTIFICATION_SERVICE_URL.replace(/\/$/, "");

    try {
        const res = await fetch(`${baseUrl}/internal/events`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-internal-api-key": env.INTERNAL_API_KEY,
            },
            body: JSON.stringify({ eventType, data }),
        });

        if (!res.ok) {
            const text = await res.text();
            console.error(`✗ [Inventory] Failed to emit ${eventType} to notification service (${res.status}):`, text || res.statusText);
        } else {
            console.log(`✓ [Inventory] Successfully emitted ${eventType} to notification service`);
        }
    } catch (err) {
        console.error(`✗ [Inventory] Error emitting ${eventType} to notification service:`, err);
    }
}
