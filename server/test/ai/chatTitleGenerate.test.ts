import { describe, it, expect, vi, beforeEach } from "vitest";
import generateChatTitle from "../../src/ai/chatTitleGenerate.js";
import titleModel from "../../src/ai/models/chatTitleGenerate.model.js";
import logger from "../../src/lib/logger.js";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

vi.mock("../../src/ai/models/chatTitleGenerate.model.js", () => ({
  default: {
    invoke: vi.fn(),
  },
}));

vi.mock("../../src/lib/logger.js", () => ({
  default: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("chatTitleGenerate.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("extractText handling (via LLM response formats)", () => {
    it("should handle plain string response from model", async () => {
      vi.mocked(titleModel.invoke).mockResolvedValueOnce({
        content: "React State Management",
      } as any);

      const title = await generateChatTitle("How do I manage state in React?");
      expect(title).toBe("React State Management");
    });

    it("should handle array of strings response from model", async () => {
      vi.mocked(titleModel.invoke).mockResolvedValueOnce({
        content: ["Node.js", " ", "JWT", " ", "Auth"],
      } as any);

      const title = await generateChatTitle("Explain JWT authentication");
      expect(title).toBe("Node.js JWT Auth");
    });

    it("should handle block array objects with { text: string } from model", async () => {
      vi.mocked(titleModel.invoke).mockResolvedValueOnce({
        content: [
          { text: "Docker" },
          { text: " " },
          { text: "Container" },
          { text: " " },
          { text: "Guide" },
        ],
      } as any);

      const title = await generateChatTitle("How to use Docker containers?");
      expect(title).toBe("Docker Container Guide");
    });

    it("should handle mixed string and block array objects", async () => {
      vi.mocked(titleModel.invoke).mockResolvedValueOnce({
        content: [
          "Python",
          { text: " " },
          { text: "Data" },
          { text: " " },
          { text: "Analysis" },
        ],
      } as any);

      const title = await generateChatTitle("Analyze data with python");
      expect(title).toBe("Python Data Analysis");
    });
  });

  describe("sanitizeTitle logic (via generateChatTitle)", () => {
    it("should strip numbered bullets like '1.' and '1)'", async () => {
      vi.mocked(titleModel.invoke).mockResolvedValueOnce({
        content: "1. React Fundamentals",
      } as any);

      const title = await generateChatTitle("What is React?");
      expect(title).toBe("React Fundamentals");
    });

    it("should strip dash, asterisk, and bullet symbols ('-', '*', '•')", async () => {
      vi.mocked(titleModel.invoke).mockResolvedValueOnce({
        content: "- Vue Basics Guide",
      } as any);

      const title1 = await generateChatTitle("What is Vue?");
      expect(title1).toBe("Vue Basics Guide");

      vi.mocked(titleModel.invoke).mockResolvedValueOnce({
        content: "* Angular Architecture Overview",
      } as any);

      const title2 = await generateChatTitle("What is Angular?");
      expect(title2).toBe("Angular Architecture Overview");

      vi.mocked(titleModel.invoke).mockResolvedValueOnce({
        content: "• Svelte Component Design",
      } as any);

      const title3 = await generateChatTitle("What is Svelte?");
      expect(title3).toBe("Svelte Component Design");
    });

    it("should remove quotes, exclamation marks, and trailing periods", async () => {
      vi.mocked(titleModel.invoke).mockResolvedValueOnce({
        content: ' "Fullstack Web Development!"... ',
      } as any);

      const title = await generateChatTitle("Tell me about fullstack web dev");
      expect(title).toBe("Fullstack Web Development");
    });

    it("should preserve valid technical symbols (. # + -)", async () => {
      vi.mocked(titleModel.invoke).mockResolvedValueOnce({
        content: "Node.js C# C++ Guide",
      } as any);

      const title = await generateChatTitle("Explain Node.js and C# and C++");
      expect(title).toBe("Node.js C# C++ Guide");
    });

    it("should take only the first line if model outputs multiple lines", async () => {
      vi.mocked(titleModel.invoke).mockResolvedValueOnce({
        content: "Docker Container Setup\nThis is an explanation of the title on second line",
      } as any);

      const title = await generateChatTitle("How to set up Docker?");
      expect(title).toBe("Docker Container Setup");
    });

    it("should normalize multiple consecutive spaces to a single space", async () => {
      vi.mocked(titleModel.invoke).mockResolvedValueOnce({
        content: "   GraphQL     Schema     Design   ",
      } as any);

      const title = await generateChatTitle("Explain GraphQL schemas");
      expect(title).toBe("GraphQL Schema Design");
    });
  });

  describe("Validation & Prompt Construction", () => {
    it("should call model with SystemMessage and HumanMessage containing the user message", async () => {
      vi.mocked(titleModel.invoke).mockResolvedValueOnce({
        content: "Express Middleware Guide",
      } as any);

      const message = "How does Express middleware work?";
      await generateChatTitle(message);

      expect(titleModel.invoke).toHaveBeenCalledTimes(1);
      const [messages, options] = vi.mocked(titleModel.invoke).mock.calls[0];
      expect(messages[0]).toBeInstanceOf(SystemMessage);
      expect((messages[0] as SystemMessage).content).toContain("Write a 2-4 word title for the user's message.");
      expect(messages[1]).toBeInstanceOf(HumanMessage);
      expect((messages[1] as HumanMessage).content).toBe(message);
      expect(options).toHaveProperty("signal");
    });

    it("should accept valid 2, 3, and 4 word titles directly on attempt 1", async () => {
      // 2 words
      vi.mocked(titleModel.invoke).mockResolvedValueOnce({ content: "React Hooks" } as any);
      expect(await generateChatTitle("Tell me about hooks")).toBe("React Hooks");

      // 3 words
      vi.mocked(titleModel.invoke).mockResolvedValueOnce({ content: "Node.js Auth Flow" } as any);
      expect(await generateChatTitle("How to auth in node")).toBe("Node.js Auth Flow");

      // 4 words
      vi.mocked(titleModel.invoke).mockResolvedValueOnce({ content: "Full Stack Development Guide" } as any);
      expect(await generateChatTitle("Full stack web development tips")).toBe("Full Stack Development Guide");
    });
  });

  describe("Retry Logic on Invalid Word Count", () => {
    it("should retry with feedback prompt when attempt 1 returns > 4 words, then succeed on attempt 2", async () => {
      // Attempt 1: 8 words (too long)
      vi.mocked(titleModel.invoke).mockResolvedValueOnce({
        content: "This Title Has Way Too Many Words In It",
      } as any);

      // Attempt 2: 3 words (valid)
      vi.mocked(titleModel.invoke).mockResolvedValueOnce({
        content: "React Query Guide",
      } as any);

      const title = await generateChatTitle("How to use React Query for caching?");

      expect(title).toBe("React Query Guide");
      expect(titleModel.invoke).toHaveBeenCalledTimes(2);

      // Verify attempt 2 received previous word count feedback
      const [messagesAttempt2] = vi.mocked(titleModel.invoke).mock.calls[1];
      expect((messagesAttempt2[0] as SystemMessage).content).toContain(
        "Previous output had 9 words. Return 2 to 4 words only."
      );
    });

    it("should retry with feedback prompt when attempt 1 returns < 2 words, then succeed on attempt 2", async () => {
      // Attempt 1: 1 word (too short)
      vi.mocked(titleModel.invoke).mockResolvedValueOnce({
        content: "React",
      } as any);

      // Attempt 2: 2 words (valid)
      vi.mocked(titleModel.invoke).mockResolvedValueOnce({
        content: "React Basics",
      } as any);

      const title = await generateChatTitle("What is React?");

      expect(title).toBe("React Basics");
      expect(titleModel.invoke).toHaveBeenCalledTimes(2);

      const [messagesAttempt2] = vi.mocked(titleModel.invoke).mock.calls[1];
      expect((messagesAttempt2[0] as SystemMessage).content).toContain(
        "Previous output had 1 words. Return 2 to 4 words only."
      );
    });
  });

  describe("Error Handling & Timeout Abort", () => {
    it("should log a warning and retry on attempt 2 if attempt 1 throws an error", async () => {
      // Attempt 1 throws network error
      vi.mocked(titleModel.invoke).mockRejectedValueOnce(new Error("Mistral API network timeout"));

      // Attempt 2 succeeds
      vi.mocked(titleModel.invoke).mockResolvedValueOnce({
        content: "PostgreSQL Database Design",
      } as any);

      const title = await generateChatTitle("How to design a PostgreSQL schema?");

      expect(title).toBe("PostgreSQL Database Design");
      expect(titleModel.invoke).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 1, error: "Mistral API network timeout" }),
        "title generation attempt failed"
      );
    });

    it("should abort immediately and not retry if signal is aborted (5s timeout expired)", async () => {
      vi.mocked(titleModel.invoke).mockImplementationOnce((_messages, options: any) => {
        // Simulate abort trigger on signal
        Object.defineProperty(options.signal, "aborted", { value: true, configurable: true });
        throw new Error("This operation was aborted");
      });

      const title = await generateChatTitle("What is Kubernetes and Docker orchestration?");

      // Loop should break after attempt 1
      expect(titleModel.invoke).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledTimes(1);
      // Falls back to user message's first 4 words
      expect(title).toBe("What is Kubernetes and");
    });
  });

  describe("Final Fallback Hierarchy", () => {
    it("should truncate lastTitle to 4 words if both attempts had > 4 words", async () => {
      // Attempt 1: 6 words
      vi.mocked(titleModel.invoke).mockResolvedValueOnce({
        content: "Building Scalable Distributed Systems Architecture Easily",
      } as any);

      // Attempt 2: 5 words
      vi.mocked(titleModel.invoke).mockResolvedValueOnce({
        content: "Distributed Systems Microservices Architecture Design",
      } as any);

      const title = await generateChatTitle("Explain microservices architecture in detail");

      // Truncated to first 4 words of lastTitle (from Attempt 2)
      expect(title).toBe("Distributed Systems Microservices Architecture");
    });

    it("should fallback to first 4 words of user message when lastTitle has < 2 words", async () => {
      // Both attempts return 1 word
      vi.mocked(titleModel.invoke).mockResolvedValueOnce({ content: "GraphQL" } as any);
      vi.mocked(titleModel.invoke).mockResolvedValueOnce({ content: "API" } as any);

      const title = await generateChatTitle("How do I write GraphQL queries and mutations?");

      // Fallback takes first 4 sanitized words of message
      expect(title).toBe("How do I write");
    });

    it("should fallback to first 4 words of user message when all attempts throw errors", async () => {
      vi.mocked(titleModel.invoke).mockRejectedValueOnce(new Error("Service Unavailable"));
      vi.mocked(titleModel.invoke).mockRejectedValueOnce(new Error("Service Unavailable"));

      const title = await generateChatTitle("Explain Event Driven Architecture Patterns");

      expect(title).toBe("Explain Event Driven Architecture");
      expect(logger.warn).toHaveBeenCalledTimes(2);
    });

    it("should fallback to DEFAULT_TITLE ('New Chat') when both LLM fails and user message has no words", async () => {
      vi.mocked(titleModel.invoke).mockRejectedValueOnce(new Error("Model failed"));
      vi.mocked(titleModel.invoke).mockRejectedValueOnce(new Error("Model failed"));

      // User message has only non-word characters / punctuation
      const title = await generateChatTitle("??? !!! ....");

      expect(title).toBe("New Chat");
    });

    it("should fallback to DEFAULT_TITLE ('New Chat') when user message is empty string", async () => {
      vi.mocked(titleModel.invoke).mockRejectedValueOnce(new Error("Model failed"));
      vi.mocked(titleModel.invoke).mockRejectedValueOnce(new Error("Model failed"));

      const title = await generateChatTitle("");

      expect(title).toBe("New Chat");
    });
  });
});
