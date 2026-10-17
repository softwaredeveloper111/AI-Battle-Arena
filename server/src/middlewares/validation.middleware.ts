import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

type ValidationTarget = "body" | "params" | "query";

const validate = (schema: ZodSchema, target: ValidationTarget = "body") => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const dataToValidate = req[target] ?? {};
    const result = schema.safeParse(dataToValidate);

    if (!result.success) {
      const firstIssue = result.error.issues[0];
      const primaryMessage = firstIssue?.message || "Validation failed";

      const formattedErrors = result.error.issues.map((issue) => ({
        field: issue.path.join(".") || target,
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

    req[target] = result.data;
    next();
  };
};

export default validate;