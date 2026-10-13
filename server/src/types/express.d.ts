import type { Document } from "mongoose";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export {};
