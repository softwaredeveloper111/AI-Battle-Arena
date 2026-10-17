import { z } from "zod";

/**
 * Reusable field validators
 */
const problemSchema = z
  .string({ error: "problem is required" })
  .trim()
  .min(1, "problem cannot be empty")
  .max(5000, "problem must be at most 5000 characters long");

const chatIdSchema = z
  .string({ error: "chatId must be a string" })
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, "invalid chatId format");

const titleSchema = z
  .string({ error: "title must be a string" })
  .trim()
  .min(1, "title cannot be empty")
  .max(60, "title must be at most 60 characters long");

/**
 * POST /api/battle/execute
 * User prompt bhejkar battle initiate karega
 */
export const executeBattleSchema = z.object({
  problem: problemSchema,
});

/**
 * POST /api/battle/session
 * Naya chat create karne ke liye
 */
export const createChatSessionSchema = z.object({
  title: titleSchema.optional(),
});

/**
 * PATCH /api/battle/session/:chatId
 * Chat ka title update ya pin/unpin karne ke liye
 */
export const updateChatSessionSchema = z.object({
  title: titleSchema.optional(),
  isPinned: z.boolean().optional(),
});

export type ExecuteBattleInput = z.infer<typeof executeBattleSchema>;
export type CreateChatSessionInput = z.infer<typeof createChatSessionSchema>;
export type UpdateChatSessionInput = z.infer<typeof updateChatSessionSchema>;
