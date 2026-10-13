import type { Response } from "express";

const ApiResponse = function<T> (res: Response, statusCode: number, message: string, data: T) {
  return res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    data
  })
}


export default ApiResponse