import type { Request, Response } from "express";
import asyncWrapper from "../utils/AsyncWrapper.util.js";
import ApiError from "../utils/ApiError.util.js";
import ApiResponse from "../utils/ApiResponse.util.js";
import ChatSessionModel from "../models/chatSession.model.js";
import BattleMessageModel from "../models/battleMessage.model.js";
import { streamBattleResponse } from "../ai/battle/graph.ai.js";
import generateChatTitle from "../ai/chatTitleGenerate.js";
import { getIO } from "../socket/server.socket.js";

import type { BattleHistoryItem } from "../ai/battle/graph.ai.js";

const HISTORY_LIMIT = 20;

/**
 * 1. Execute Battle Turn
 * User prompt bhejega, create chat title and AI LangGraph graph run hoga simultenously hoga, aur battle message save hoga and chat title vi save hoga
 */
export const executeBattleController = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id;
    const problem = req.body?.problem;
    const chatId = req.body?.chatId;
    const socketId = req.body?.socketId;

    if (!problem) {
      throw new ApiError("Problem is required", 400);
    }

    let chat = null;
    let history: BattleHistoryItem[] = [];

    if (chatId) {
      chat = await ChatSessionModel.findOne({ _id: chatId, userId });
      if (!chat) {
        throw new ApiError("Chat session not found", 404);
      }

      const recent = await BattleMessageModel.find({ chatId: chat._id })
        .sort({ createdAt: -1, _id: -1 })
        .limit(HISTORY_LIMIT)
        .lean();

      history = recent.reverse().map((msg) => ({
        problem: msg.problem,
        solution_1: msg.solution_1,
        solution_2: msg.solution_2,
      }));
    }

    const isNewChat = !chat;
    const io = getIO();

    let solution_1 = "";
    let solution_2 = "";
    let judge = {
      solution_1_score: 0,
      solution_2_score: 0,
      solution_1_reasoning: "",
      solution_2_reasoning: "",
    };

    // LangGraph streaming runner with error handling
    const runStream = async () => {
      try {
        for await (const chunk of streamBattleResponse(problem, history)) {
          if (chunk.type === "custom") {
            // Token, status, ya model_error event socket client ko emit karo
            if (io && socketId) {
              io.to(socketId).emit("battle:stream", chunk.data);
            }
          } else if (chunk.type === "updates") {
            if (chunk.data.SolutionNode) {
              solution_1 = chunk.data.SolutionNode.solution_1 || "";
              solution_2 = chunk.data.SolutionNode.solution_2 || "";
            }
            if (chunk.data.compareNode?.judge) {
              judge = chunk.data.compareNode.judge;
            }
          }
        }
      } catch (err) {
        if (io && socketId) {
          io.to(socketId).emit("battle:error", {
            message: "An unexpected error occurred during the battle.",
          });
        }
        throw err;
      }
    };

    // Graph stream aur new chat ke liye title generation parallel mein chalenge
    const [, chatTitle] = await Promise.all([
      runStream(),
      isNewChat ? generateChatTitle(problem) : Promise.resolve(null),
    ]);

    const score1 = judge?.solution_1_score ?? 0;
    const score2 = judge?.solution_2_score ?? 0;

    let winner: "solution_1" | "solution_2" | "tie" = "tie";
    if (score1 > score2) {
      winner = "solution_1";
    } else if (score2 > score1) {
      winner = "solution_2";
    }

    let activeChatId = chat?._id;

    if (!activeChatId) {
      const newSession = await ChatSessionModel.create({
        userId,
        title: chatTitle || "New Battle",
        mode: "battle",
      });
      activeChatId = newSession._id;
    } else {
      await ChatSessionModel.findByIdAndUpdate(activeChatId, {
        $set: { updatedAt: new Date() },
      });
    }

    // Database me battle turn message save karo
    const battleMessage = await BattleMessageModel.create({
      chatId: activeChatId,
      problem,
      solution_1,
      solution_2,
      judge: {
        solution_1_score: score1,
        solution_2_score: score2,
        solution_1_reasoning: judge?.solution_1_reasoning || "",
        solution_2_reasoning: judge?.solution_2_reasoning || "",
      },
      winner,
    });

    // Stream complete hone ka event emit karo
    if (io && socketId) {
      io.to(socketId).emit("battle:done", {
        chatId: activeChatId,
        turn: battleMessage,
      });
    }

    return ApiResponse(res, 200, "Battle turn completed successfully", {
      chatId: activeChatId,
      turn: battleMessage,
    });
  }
);


/**
 * 3. Get All Chat Sessions
 * Sidebar me user ki battle history load karne ke liye
 */
export const getAllChatSessionsController = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id;

    const chatListSessions = await ChatSessionModel.find({
      userId,
      mode: "battle",
    })
      .sort({ isPinned: -1, updatedAt: -1 })
      .lean();

    return ApiResponse(
      res,
      200,
      "Chat sessions fetched successfully",
      chatListSessions
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
    const chatId = req.params?.chatId;

    if(!chatId){
      throw new ApiError("Chat ID is required", 400);
    }

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
 * 5. rename Chat title (Title rename)
 */
export const renameChatSessionController = asyncWrapper(
  async (req: Request, res: Response) => {

    const userId = (req.user as any)?._id;
    const chatId = req.params?.chatId;
    const title = req.body?.title;

    if (!chatId) {
      throw new ApiError("Chat ID is required", 400);
    }

    if (!title) {
      throw new ApiError("Title is required", 400);
    }

    const chatSession = await ChatSessionModel.findOneAndUpdate(
      { _id: chatId, userId },
      { title },
      { returnDocument: "after" }
    );

    if (!chatSession) {
      throw new ApiError("Chat session not found", 404);
    }

    return ApiResponse(res, 200, "Chat session renamed successfully", chatSession);
  }
);


/**
 * 6. Delete Chat Session
 * Chat aur uske andar ke saare battle turns delete karne ke liye
 */
export const deleteChatSessionController = asyncWrapper(
  async (req: Request, res: Response) => {

    const userId = (req.user as any)?._id;
    const chatId = req.params?.chatId;

    if (!chatId) {
      throw new ApiError("Chat ID is required", 400);
    }

    const chatSession = await ChatSessionModel.findOneAndDelete({
      _id: chatId,
      userId,
    });

    if (!chatSession) {
      throw new ApiError("Chat session not found", 404);
    }

    // Us chat ke saare messages bhi clean up karo
    await BattleMessageModel.deleteMany({ chatId });

    return ApiResponse(res, 200, "Chat session deleted successfully", null);
  }
);




/**
 * 7. Pinned/unpinned chat session
 * pinned chat sesstion, unpinned chat session
 */
export const pinnedChatSessionController = asyncWrapper(
  async (req: Request, res: Response) => {
    const userId = (req.user as any)?._id;
    const chatId = req.params?.chatId;

    if (!chatId) {
      throw new ApiError("Chat ID is required", 400);
    }

    const chatSession = await ChatSessionModel.findOne({ _id: chatId, userId });

    if (!chatSession) {
      throw new ApiError("Chat session not found", 404);
    }

    chatSession.isPinned = !chatSession.isPinned;
    await chatSession.save();
  

    return ApiResponse(res, 200, "Chat session pinned successfully", chatSession);
  }
);