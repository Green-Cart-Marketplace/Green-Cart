import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { AppError } from "../errors/AppError";

export function internalAuth(req: Request, _res: Response, next: NextFunction): void {
    const expected = env.INTERNAL_API_KEY;
    const provided = req.headers["x-internal-api-key"];

    if (!expected) {
        return next(new AppError("Internal API key is not configured.", 500, "INTERNAL_AUTH_NOT_CONFIGURED"));
    }

    if (typeof provided !== "string" || provided !== expected) {
        return next(new AppError("Forbidden.", 403, "FORBIDDEN"));
    }

    next();
}
