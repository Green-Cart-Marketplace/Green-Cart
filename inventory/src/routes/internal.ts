import { Router, Request, Response, NextFunction } from "express";
import { internalAuth } from "../middleware/internalAuth.js";
import { orderService } from "../services/order.service.js";
import { AppError } from "../errors/AppError.js";

const router = Router();

router.use(internalAuth);

// GET /internal/orders/:orderId
router.get("/orders/:orderId", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const order = await orderService.getOrderAny(req.params.orderId);
        res.status(200).json(order);
    } catch (err) {
        next(err);
    }
});

// POST /internal/orders/:orderId/payment
router.post("/orders/:orderId/payment", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status, transactionId, payHereId } = req.body as {
            status?: string;
            transactionId?: string;
            payHereId?: string;
        };

        if (status !== "paid" && status !== "failed") {
            return next(new AppError("Invalid status value", 400, "INVALID_STATUS"));
        }

        const order = await orderService.updateOrderPaymentInternal({
            orderId: req.params.orderId,
            status,
            transactionId,
            payHereId,
        });

        res.status(200).json(order);
    } catch (err) {
        next(err);
    }
});

export default router;
