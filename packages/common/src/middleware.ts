import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization; // Bearer token
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  console.log(process.env.JWT_SECRET);
  const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
    algorithms: ["HS256"],
  });

  if (!decoded) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const userId = (decoded as any).userId;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  //@ts-ignore
  req.userId = userId;
  next();
}