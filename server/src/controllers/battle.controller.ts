import type { Request, Response } from "express";
import asyncWrapper from "../utils/AsyncWrapper.util.js";
import ApiError from "../utils/ApiError.util.js";
import ApiResponse from "../utils/ApiResponse.util.js";
import ChatSessionModel from "../models/chatSession.model.js";
import BattleMessageModel from "../models/battleMessage.model.js";
import generateResponse from "../ai/battle/graph.ai.js";

/**
 * 1. Execute Battle Turn
 * User prompt bhejega, AI LangGraph graph run hoga, aur battle message save hoga
 */
export const executeBattleController = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id;
    const { problem, chatId } = req.body;

    let session;

    // Agar chatId provide kiya hai to verify karo ki valid aur user ka hi hai
    if (chatId) {
      session = await ChatSessionModel.findOne({ _id: chatId, userId });
      if (!session) {
        throw new ApiError("Chat session not found", 404);
      }
    } else {
      // Agar chatId nahi hai to naya chat session auto-create karo
      const autoTitle =
        problem.length > 40 ? `${problem.slice(0, 40)}...` : problem;

      session = await ChatSessionModel.create({
        userId,
        title: autoTitle,
        mode: "battle",
      });
    }

    // AI Battle LangGraph invoke karo
    const aiResult = await generateResponse(problem);

    const score1 = aiResult.judge?.solution_1_score ?? 0;
    const score2 = aiResult.judge?.solution_2_score ?? 0;

    let winner: "solution_1" | "solution_2" | "tie" = "tie";
    if (score1 > score2) {
      winner = "solution_1";
    } else if (score2 > score1) {
      winner = "solution_2";
    }

    // Database me battle turn message save karo
    const battleMessage = await BattleMessageModel.create({
      chatId: session._id,
      problem,
      solution_1: aiResult.solution_1,
      solution_2: aiResult.solution_2,
      judge: {
        solution_1_score: score1,
        solution_2_score: score2,
        solution_1_reasoning: aiResult.judge?.solution_1_reasoning || "",
        solution_2_reasoning: aiResult.judge?.solution_2_reasoning || "",
      },
      winner,
    });

    // Session ka updatedAt touch karo taaki sidebar me top par aaye
    session.updatedAt = new Date();
    await session.save();

    return ApiResponse(res, 200, "Battle turn completed successfully", {
      chatId: session._id,
      turn: battleMessage,
    });
  }
);

/**
 * 2. Create Chat Session
 * Sidebar me 'New Battle Chat' button ke liye
 */
export const createChatSessionController = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id;
    const { title } = req.body;

    const session = await ChatSessionModel.create({
      userId,
      title: title || "New Battle",
      mode: "battle",
    });

    return ApiResponse(res, 201, "Chat session created successfully", session);
  }
);

/**
 * 3. Get All Chat Sessions
 * Sidebar me user ki battle history load karne ke liye
 */
export const getAllChatSessionsController = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id;

    const sessions = await ChatSessionModel.find({
      userId,
      mode: "battle",
    })
      .sort({ isPinned: -1, updatedAt: -1 })
      .lean();

    return ApiResponse(
      res,
      200,
      "Chat sessions fetched successfully",
      sessions
    );
  }
);

/**
 * 4. Get Chat Messages By Chat ID
 * Sidebar se kisi chat par click karne par uske saare battle turns load karne ke liye
 */
export const getChatMessagesController = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id;
    const { chatId } = req.params;

    const session = await ChatSessionModel.findOne({ _id: chatId, userId });
    if (!session) {
      throw new ApiError("Chat session not found", 404);
    }

    const messages = await BattleMessageModel.find({ chatId })
      .sort({ createdAt: 1 })
      .lean();

    return ApiResponse(res, 200, "Messages fetched successfully", {
      session,
      messages,
    });
  }
);

/**
 * 5. Update Chat Session (Title rename ya Pin/Unpin)
 */
export const updateChatSessionController = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id;
    const { chatId } = req.params;
    const { title, isPinned } = req.body;

    const session = await ChatSessionModel.findOne({ _id: chatId, userId });
    if (!session) {
      throw new ApiError("Chat session not found", 404);
    }

    if (title !== undefined) session.title = title;
    if (isPinned !== undefined) session.isPinned = isPinned;

    await session.save();

    return ApiResponse(res, 200, "Chat session updated successfully", session);
  }
);

/**
 * 6. Delete Chat Session
 * Chat aur uske andar ke saare battle turns delete karne ke liye
 */
export const deleteChatSessionController = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id;
    const { chatId } = req.params;

    const session = await ChatSessionModel.findOneAndDelete({
      _id: chatId,
      userId,
    });

    if (!session) {
      throw new ApiError("Chat session not found", 404);
    }

    // Us chat ke saare messages bhi clean up karo
    await BattleMessageModel.deleteMany({ chatId });

    return ApiResponse(res, 200, "Chat session deleted successfully", null);
  }
);
