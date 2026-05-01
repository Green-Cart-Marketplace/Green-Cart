import { Request, Response, NextFunction } from "express";
import { orderService } from "../services/order.service.js";
import { AppError } from "../errors/AppError.js";
import { AuthPayload } from "../middleware/authenticate.js";
import { emitNotificationEvent } from "../services/notificationEvents.js";

export class OrderController {
    /**
     * POST /orders
     * Create order from cart
     */
    async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = req.user as AuthPayload;
            const order = await orderService.createOrderFromCart(user.sub);

            void emitNotificationEvent("ORDER_CREATED", {
                orderId: order.orderId,
                customerId: order.customerId,
                totalAmount: order.totalAmount,
                currency: order.currency,
                status: order.status,
                createdAt: order.createdAt,
            });

            res.status(201).json(order);
        } catch (err) {
            next(err);
        }
    }

    /**
     * GET /orders
     * Get customer's orders
     */
    async getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = req.user as AuthPayload;
            const limit = Math.min(Number(req.query.limit) || 20, 100);
            const offset = Number(req.query.offset) || 0;

            if (offset < 0) {
                return next(new AppError("Offset cannot be negative", 400, "INVALID_OFFSET"));
            }

            const { orders, total } = user.role === "admin"
                ? await orderService.getAllOrders(limit, offset)
                : await orderService.getCustomerOrders(user.sub, limit, offset);

            res.status(200).json({
                orders,
                total,
                limit,
                offset
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * GET /orders/:orderId
     * Get specific order
     */
    async getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = req.user as AuthPayload;
            const { orderId } = req.params;

            const order = user.role === "admin"
                ? await orderService.getOrderAny(orderId)
                : await orderService.getOrder(orderId, user.sub);

            res.status(200).json(order);
        } catch (err) {
            next(err);
        }
    }

    /**
     * PATCH /orders/:orderId/status
     * Update order status (admin only)
     */
    async updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = req.user as AuthPayload;
            const { orderId } = req.params;
            const { status } = req.body;

            if (user.role !== "admin") {
                return next(new AppError("Admin access required.", 403, "FORBIDDEN"));
            }

            if (!status || !["accepted", "rejected", "shipped", "delivered", "cancelled"].includes(status)) {
                return next(new AppError("Invalid status value", 400, "INVALID_STATUS"));
            }

            const order = await orderService.updateOrderStatusAdmin(orderId, status);

            if (status === "accepted") {
                void emitNotificationEvent("ORDER_ACCEPTED", {
                    orderId: order.orderId,
                    customerId: order.customerId,
                    totalAmount: order.totalAmount,
                    currency: order.currency,
                    status: order.status,
                    updatedAt: order.updatedAt,
                });
            }
            if (status === "rejected") {
                void emitNotificationEvent("ORDER_REJECTED", {
                    orderId: order.orderId,
                    customerId: order.customerId,
                    totalAmount: order.totalAmount,
                    currency: order.currency,
                    status: order.status,
                    updatedAt: order.updatedAt,
                });
            }

            res.status(200).json(order);
        } catch (err) {
            next(err);
        }
    }
}

export const orderController = new OrderController();
