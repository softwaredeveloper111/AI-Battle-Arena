import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const dataToValidate = req.body ?? {};
    const result = schema.safeParse(dataToValidate);

    if (!result.success) {
      const firstIssue = result.error.issues[0];
      const primaryMessage = firstIssue?.message || "Validation failed";

      const formattedErrors = result.error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      }));

      res.status(400).json({
        success: false,
        statusCode: 400,
        message: primaryMessage,
        errors: formattedErrors,
      });

      return;
    }

    req.body = result.data;
    next();
  };
};

export default validate;