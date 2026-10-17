import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import type { Express } from "express";
import { getApp } from "../helpers/app.js";
import { createUser, signAuthToken, authCookie } from "../helpers/factories.js";
import ChatSessionModel from "../../src/models/chatSession.model.js";
import BattleMessageModel from "../../src/models/battleMessage.model.js";

// Mock AI components for isolated, fast, and deterministic tests
const mockStreamBattleResponse = vi.fn(async function* (
  _problem: string,
  _history: any[] = []
) {
  yield {
    type: "custom",
    data: { type: "token", model: "solution_1", token: "Solution 1 chunk" },
  };
  yield {
    type: "custom",
    data: { type: "token", model: "solution_2", token: "Solution 2 chunk" },
  };
  yield {
    type: "updates",
    data: {
      SolutionNode: {
        solution_1: "Solution 1 complete response",
        solution_2: "Solution 2 complete response",
      },
      compareNode: {
        judge: {
          solution_1_score: 9,
          solution_2_score: 8,
          solution_1_reasoning: "Solution 1 is better",
          solution_2_reasoning: "Solution 2 is acceptable",
        },
      },
    },
  };
});

vi.mock("../../src/ai/battle/graph.ai.js", () => ({
  streamBattleResponse: (...args: any[]) => mockStreamBattleResponse(...args),
  default: vi.fn(),
}));

vi.mock("../../src/ai/chatTitleGenerate.js", () => ({
  default: vi.fn().mockResolvedValue("Mocked Battle Title"),
}));

const mockSocketEmit = vi.fn();
const mockTo = vi.fn().mockReturnValue({ emit: mockSocketEmit });
const mockIo = {
  to: mockTo,
  emit: mockSocketEmit,
};

vi.mock("../../src/socket/server.socket.js", () => ({
  initSocket: vi.fn(),
  getIO: vi.fn(() => mockIo),
}));

describe("Battle Routes (/api/battle)", () => {
  let app: Express;

  beforeAll(async () => {
    app = await getApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ========================================================================
   * 1. POST /api/battle/execute-battle
   * ======================================================================== */
  describe("POST /api/battle/execute-battle", () => {
    it("should return 401 if unauthenticated", async () => {
      const res = await request(app)
        .post("/api/battle/execute-battle")
        .send({ problem: "What is recursion?" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 if problem is missing", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);

      const res = await request(app)
        .post("/api/battle/execute-battle")
        .set("Cookie", authCookie(token))
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 if problem is empty", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);

      const res = await request(app)
        .post("/api/battle/execute-battle")
        .set("Cookie", authCookie(token))
        .send({ problem: "   " });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 if chatId format is invalid", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);

      const res = await request(app)
        .post("/api/battle/execute-battle")
        .set("Cookie", authCookie(token))
        .send({ problem: "Valid problem", chatId: "not-a-valid-24-hex-id" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should successfully execute battle turn and create a new chat session", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);

      const res = await request(app)
        .post("/api/battle/execute-battle")
        .set("Cookie", authCookie(token))
        .send({ problem: "Explain quantum computing in simple terms" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("chatId");
      expect(res.body.data).toHaveProperty("turn");

      const { chatId, turn } = res.body.data;
      expect(turn.problem).toBe("Explain quantum computing in simple terms");
      expect(turn.solution_1).toBe("Solution 1 complete response");
      expect(turn.solution_2).toBe("Solution 2 complete response");
      expect(turn.winner).toBe("solution_1");
      expect(turn.judge.solution_1_score).toBe(9);
      expect(turn.judge.solution_2_score).toBe(8);

      // Verify DB persistence
      const savedSession = await ChatSessionModel.findById(chatId);
      expect(savedSession).not.toBeNull();
      expect(savedSession?.title).toBe("Mocked Battle Title");
      expect(savedSession?.userId.toString()).toBe(user.id);

      const savedMessage = await BattleMessageModel.findOne({ chatId });
      expect(savedMessage).not.toBeNull();
      expect(savedMessage?.problem).toBe("Explain quantum computing in simple terms");
    });

    it("should append turn to an existing chat session and pass history", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);

      // Create an existing chat session with 1 turn
      const session = await ChatSessionModel.create({
        userId: user.id,
        title: "Existing Battle Chat",
        mode: "battle",
      });

      await BattleMessageModel.create({
        chatId: session._id,
        problem: "First question",
        solution_1: "Ans 1",
        solution_2: "Ans 2",
        judge: {
          solution_1_score: 8,
          solution_2_score: 7,
          solution_1_reasoning: "Good",
          solution_2_reasoning: "Fair",
        },
        winner: "solution_1",
      });

      const res = await request(app)
        .post("/api/battle/execute-battle")
        .set("Cookie", authCookie(token))
        .send({
          problem: "Follow-up question",
          chatId: session._id.toString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.data.chatId).toBe(session._id.toString());

      // Verify that history was passed to streamBattleResponse
      expect(mockStreamBattleResponse).toHaveBeenCalledWith(
        "Follow-up question",
        expect.arrayContaining([
          expect.objectContaining({
            problem: "First question",
            solution_1: "Ans 1",
            solution_2: "Ans 2",
          }),
        ])
      );

      // Verify 2 messages exist under this chatId now
      const count = await BattleMessageModel.countDocuments({ chatId: session._id });
      expect(count).toBe(2);
    });

    it("should return 404 if chatId does not exist", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post("/api/battle/execute-battle")
        .set("Cookie", authCookie(token))
        .send({ problem: "Some problem", chatId: nonExistentId });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain("not found");
    });

    it("should return 404 if trying to append to another user's chat session", async () => {
      const user1 = await createUser();
      const user2 = await createUser();
      const token1 = signAuthToken(user1.id);

      const user2Session = await ChatSessionModel.create({
        userId: user2.id,
        title: "User 2 Chat",
        mode: "battle",
      });

      const res = await request(app)
        .post("/api/battle/execute-battle")
        .set("Cookie", authCookie(token1))
        .send({
          problem: "Hijack attempt",
          chatId: user2Session._id.toString(),
        });

      expect(res.status).toBe(404);
    });

    it("should stream events to socketId when provided", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);
      const testSocketId = "test-socket-12345";

      const res = await request(app)
        .post("/api/battle/execute-battle")
        .set("Cookie", authCookie(token))
        .send({
          problem: "Stream this battle",
          socketId: testSocketId,
        });

      expect(res.status).toBe(200);
      expect(mockTo).toHaveBeenCalledWith(testSocketId);
      expect(mockSocketEmit).toHaveBeenCalledWith(
        "battle:stream",
        expect.objectContaining({ type: "token" })
      );
      expect(mockSocketEmit).toHaveBeenCalledWith(
        "battle:done",
        expect.objectContaining({ chatId: expect.any(Object) })
      );
    });
  });

  /* ========================================================================
   * 2. GET /api/battle/chat/history
   * ======================================================================== */
  describe("GET /api/battle/chat/history", () => {
    it("should return 401 if unauthenticated", async () => {
      const res = await request(app).get("/api/battle/chat/history");
      expect(res.status).toBe(401);
    });

    it("should return empty array when user has no chat sessions", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);

      const res = await request(app)
        .get("/api/battle/chat/history")
        .set("Cookie", authCookie(token));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it("should return user's chat sessions sorted by pinned first, then updatedAt", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);

      const chat1 = await ChatSessionModel.create({
        userId: user.id,
        title: "Chat 1 Regular",
        isPinned: false,
        updatedAt: new Date(Date.now() - 10000),
      });

      const chat2 = await ChatSessionModel.create({
        userId: user.id,
        title: "Chat 2 Pinned",
        isPinned: true,
        updatedAt: new Date(Date.now() - 5000),
      });

      const chat3 = await ChatSessionModel.create({
        userId: user.id,
        title: "Chat 3 Recent Regular",
        isPinned: false,
        updatedAt: new Date(),
      });

      const res = await request(app)
        .get("/api/battle/chat/history")
        .set("Cookie", authCookie(token));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
      // Pinned chat should come first
      expect(res.body.data[0]._id).toBe(chat2._id.toString());
      // Then the more recently updated regular chat
      expect(res.body.data[1]._id).toBe(chat3._id.toString());
      expect(res.body.data[2]._id).toBe(chat1._id.toString());
    });

    it("should maintain strict user isolation and not return other users' chats", async () => {
      const user1 = await createUser();
      const user2 = await createUser();
      const token1 = signAuthToken(user1.id);

      await ChatSessionModel.create({
        userId: user1.id,
        title: "User 1 Chat",
        mode: "battle",
      });

      await ChatSessionModel.create({
        userId: user2.id,
        title: "User 2 Secret Chat",
        mode: "battle",
      });

      const res = await request(app)
        .get("/api/battle/chat/history")
        .set("Cookie", authCookie(token1));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe("User 1 Chat");
    });
  });

  /* ========================================================================
   * 3. GET /api/battle/messages/:chatId
   * ======================================================================== */
  describe("GET /api/battle/messages/:chatId", () => {
    it("should return 401 if unauthenticated", async () => {
      const validId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).get(`/api/battle/messages/${validId}`);
      expect(res.status).toBe(401);
    });

    it("should return 400 if chatId param is invalid format", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);

      const res = await request(app)
        .get("/api/battle/messages/invalid-id-format")
        .set("Cookie", authCookie(token));

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("invalid chatId format");
    });

    it("should return 404 if chat session does not exist", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .get(`/api/battle/messages/${nonExistentId}`)
        .set("Cookie", authCookie(token));

      expect(res.status).toBe(404);
      expect(res.body.message).toContain("not found");
    });

    it("should return 404 when requesting another user's chat session", async () => {
      const user1 = await createUser();
      const user2 = await createUser();
      const token1 = signAuthToken(user1.id);

      const user2Session = await ChatSessionModel.create({
        userId: user2.id,
        title: "User 2 Chat",
        mode: "battle",
      });

      const res = await request(app)
        .get(`/api/battle/messages/${user2Session._id}`)
        .set("Cookie", authCookie(token1));

      expect(res.status).toBe(404);
    });

    it("should return 200 with session and messages in chronological order", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);

      const session = await ChatSessionModel.create({
        userId: user.id,
        title: "My Battle Conversation",
        mode: "battle",
      });

      const msg1 = await BattleMessageModel.create({
        chatId: session._id,
        problem: "Turn 1",
        solution_1: "Sol 1",
        solution_2: "Sol 2",
        judge: {
          solution_1_score: 9,
          solution_2_score: 8,
          solution_1_reasoning: "R1",
          solution_2_reasoning: "R2",
        },
        winner: "solution_1",
        createdAt: new Date(Date.now() - 5000),
      });

      const msg2 = await BattleMessageModel.create({
        chatId: session._id,
        problem: "Turn 2",
        solution_1: "Sol 1B",
        solution_2: "Sol 2B",
        judge: {
          solution_1_score: 7,
          solution_2_score: 9,
          solution_1_reasoning: "R1B",
          solution_2_reasoning: "R2B",
        },
        winner: "solution_2",
        createdAt: new Date(),
      });

      const res = await request(app)
        .get(`/api/battle/messages/${session._id}`)
        .set("Cookie", authCookie(token));

      expect(res.status).toBe(200);
      expect(res.body.data.session._id).toBe(session._id.toString());
      expect(res.body.data.messages).toHaveLength(2);
      expect(res.body.data.messages[0]._id).toBe(msg1._id.toString());
      expect(res.body.data.messages[1]._id).toBe(msg2._id.toString());
    });
  });

  /* ========================================================================
   * 4. PATCH /api/battle/rename/:chatId
   * ======================================================================== */
  describe("PATCH /api/battle/rename/:chatId", () => {
    it("should return 401 if unauthenticated", async () => {
      const validId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .patch(`/api/battle/rename/${validId}`)
        .send({ title: "New Title" });

      expect(res.status).toBe(401);
    });

    it("should return 400 if title is missing", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);
      const validId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .patch(`/api/battle/rename/${validId}`)
        .set("Cookie", authCookie(token))
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("title");
    });

    it("should return 400 if title exceeds 60 characters", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);
      const validId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .patch(`/api/battle/rename/${validId}`)
        .set("Cookie", authCookie(token))
        .send({ title: "a".repeat(61) });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("60 characters");
    });

    it("should return 404 if chat session does not exist", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .patch(`/api/battle/rename/${nonExistentId}`)
        .set("Cookie", authCookie(token))
        .send({ title: "Renamed Title" });

      expect(res.status).toBe(404);
    });

    it("should successfully rename the chat session", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);

      const session = await ChatSessionModel.create({
        userId: user.id,
        title: "Old Title",
        mode: "battle",
      });

      const res = await request(app)
        .patch(`/api/battle/rename/${session._id}`)
        .set("Cookie", authCookie(token))
        .send({ title: "Updated Brand New Title" });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe("Updated Brand New Title");

      // Verify DB update
      const updated = await ChatSessionModel.findById(session._id);
      expect(updated?.title).toBe("Updated Brand New Title");
    });
  });

  /* ========================================================================
   * 5. PATCH /api/battle/pinned/:chatId
   * ======================================================================== */
  describe("PATCH /api/battle/pinned/:chatId", () => {
    it("should return 401 if unauthenticated", async () => {
      const validId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).patch(`/api/battle/pinned/${validId}`);
      expect(res.status).toBe(401);
    });

    it("should return 404 if session not found", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .patch(`/api/battle/pinned/${nonExistentId}`)
        .set("Cookie", authCookie(token));

      expect(res.status).toBe(404);
    });

    it("should toggle isPinned from false to true", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);

      const session = await ChatSessionModel.create({
        userId: user.id,
        title: "Unpinned Chat",
        isPinned: false,
        mode: "battle",
      });

      const res = await request(app)
        .patch(`/api/battle/pinned/${session._id}`)
        .set("Cookie", authCookie(token));

      expect(res.status).toBe(200);
      expect(res.body.data.isPinned).toBe(true);

      const updated = await ChatSessionModel.findById(session._id);
      expect(updated?.isPinned).toBe(true);
    });

    it("should toggle isPinned from true back to false", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);

      const session = await ChatSessionModel.create({
        userId: user.id,
        title: "Already Pinned Chat",
        isPinned: true,
        mode: "battle",
      });

      const res = await request(app)
        .patch(`/api/battle/pinned/${session._id}`)
        .set("Cookie", authCookie(token));

      expect(res.status).toBe(200);
      expect(res.body.data.isPinned).toBe(false);

      const updated = await ChatSessionModel.findById(session._id);
      expect(updated?.isPinned).toBe(false);
    });
  });

  /* ========================================================================
   * 6. DELETE /api/battle/delete/:chatId
   * ======================================================================== */
  describe("DELETE /api/battle/delete/:chatId", () => {
    it("should return 401 if unauthenticated", async () => {
      const validId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).delete(`/api/battle/delete/${validId}`);
      expect(res.status).toBe(401);
    });

    it("should return 404 if session does not exist", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .delete(`/api/battle/delete/${nonExistentId}`)
        .set("Cookie", authCookie(token));

      expect(res.status).toBe(404);
    });

    it("should successfully delete chat session and clean up all associated battle messages", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);

      const session = await ChatSessionModel.create({
        userId: user.id,
        title: "Chat To Be Deleted",
        mode: "battle",
      });

      // Add 2 messages to this chat
      await BattleMessageModel.create({
        chatId: session._id,
        problem: "Q1",
        solution_1: "A1",
        solution_2: "A2",
        judge: {
          solution_1_score: 5,
          solution_2_score: 5,
          solution_1_reasoning: "tie",
          solution_2_reasoning: "tie",
        },
        winner: "tie",
      });

      await BattleMessageModel.create({
        chatId: session._id,
        problem: "Q2",
        solution_1: "B1",
        solution_2: "B2",
        judge: {
          solution_1_score: 6,
          solution_2_score: 4,
          solution_1_reasoning: "B1 better",
          solution_2_reasoning: "B2 worse",
        },
        winner: "solution_1",
      });

      const res = await request(app)
        .delete(`/api/battle/delete/${session._id}`)
        .set("Cookie", authCookie(token));

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("deleted successfully");

      // Verify ChatSession is gone from DB
      const sessionInDb = await ChatSessionModel.findById(session._id);
      expect(sessionInDb).toBeNull();

      // Verify all BattleMessages are deleted from DB
      const messagesCount = await BattleMessageModel.countDocuments({ chatId: session._id });
      expect(messagesCount).toBe(0);
    });
  });
});
