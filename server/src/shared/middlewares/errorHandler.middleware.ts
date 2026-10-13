import config from "../../config/config.js";
import type { ErrorRequestHandler } from "express";

type RESPONSE = {
  success: boolean;
  statusCode: number;
  message: string;
  stack?: string;
  error?: string;
  details?: string;
};

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  const response: RESPONSE = {
    success: false,
    statusCode,
    message: err.message || "internal sever error",
  };

  if (config.NODE_ENV === "development") {
    response.stack = err.stack;

    if (err?.details) {
      response.details = err.details;
    }

    if (err?.error) {
      response.error = err.error?.message || String(err.error);
    }
  }

  return res.status(statusCode).json(response);
};

export default errorHandler;
