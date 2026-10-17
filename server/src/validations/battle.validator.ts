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
  .regex(/^[0-9a-fA-F]{24}$/, "invalid chatId format, must be a 24-character hexadecimal ObjectId");



const titleSchema = z
  .string({ error: "title must be a string" })
  .trim()
  .min(1, "title cannot be empty")
  .max(60, "title must be at most 60 characters long");



export const executeBattleSchema = z.object({
  problem: problemSchema,
  chatId: chatIdSchema.optional(),
  socketId: z.string().trim().optional(),
});



export const getChatMessagesSchema = z.object({
  chatId: chatIdSchema,
})



export const pinnedChatSchema = z.object({
  chatId: chatIdSchema,
})




export const deleteChatSessionSchema = z.object({
  chatId: chatIdSchema,
})



export const renameChatSessionParamSchema = z.object({
  chatId: chatIdSchema,
});

export const renameChatSessionBodySchema = z.object({
  title: titleSchema,
});

export const renameChatSessionSchema = renameChatSessionBodySchema;





export type ExecuteBattleInput = z.infer<typeof executeBattleSchema>;
export type GetChatMessagesInput = z.infer<typeof getChatMessagesSchema>;
export type PinnedChatInput = z.infer<typeof pinnedChatSchema>;
export type DeleteChatSessionInput = z.infer<typeof deleteChatSessionSchema>;
export type RenameChatSessionParamInput = z.infer<typeof renameChatSessionParamSchema>;
export type RenameChatSessionBodyInput = z.infer<typeof renameChatSessionBodySchema>;
export type RenameChatSessionInput = RenameChatSessionBodyInput;