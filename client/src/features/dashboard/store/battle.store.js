import { create } from "zustand";
import { devtools } from "zustand/middleware";

const battleStore = (set) => ({
  // --- Initial State ---

  // Sidebar chat history
  chatSessions: [],
  chatSessionsLoading: false,
  chatSessionsError: null,

  // Currently opened chat
  activeChatId: null,
  activeSession: null,
  messages: [],
  messagesLoading: false,
  messagesError: null,

  // Live battle (socket.io streaming)
  socketId: null,
  isBattleRunning: false,
  isCreatingNewChat: false,
  battleError: null,
  streamStatus: "",
  streamingProblem: "",
  streamingSolution1: "",
  streamingSolution2: "",
  modelErrors: { solution_1: null, solution_2: null },


  // Socket
  setSocketId: (socketId) =>
    set({
      socketId,
    }),


  // Active chat
  setActiveChatId: (chatId = null) =>
    set({
      activeChatId: chatId,
    }),


  // Chat history (sidebar)
  fetchChatSessionsStart: () =>
    set({
      chatSessionsLoading: true,
      chatSessionsError: null,
    }),

  fetchChatSessionsSuccess: (chatSessions = []) =>
    set({
      chatSessionsLoading: false,
      chatSessionsError: null,
      chatSessions,
    }),

  fetchChatSessionsFailure: (error) =>
    set({
      chatSessionsLoading: false,
      chatSessionsError: error,
    }),


  // Chat messages
  fetchMessagesStart: () =>
    set({
      messagesLoading: true,
      messagesError: null,
    }),

  fetchMessagesSuccess: ({ session = null, messages = [] } = {}) =>
    set({
      messagesLoading: false,
      messagesError: null,
      activeSession: session,
      messages,
    }),

  fetchMessagesFailure: (error) =>
    set({
      messagesLoading: false,
      messagesError: error,
    }),

  clearMessages: () =>
    set({
      activeChatId: null,
      activeSession: null,
      messages: [],
      messagesError: null,
      isCreatingNewChat: false,
    }),


  // Execute battle
  executeBattleStart: (problem, isNewChat = false) =>
    set({
      isBattleRunning: true,
      isCreatingNewChat: isNewChat,
      battleError: null,
      streamStatus: "",
      streamingProblem: problem,
      streamingSolution1: "",
      streamingSolution2: "",
      modelErrors: { solution_1: null, solution_2: null },
    }),

  // socket event: battle:stream  { type: "status" | "token" | "model_error" }
  battleStatusReceived: (message) =>
    set({
      streamStatus: message,
    }),

  battleTokenReceived: (model, token) =>
    set((state) =>
      model === "solution_1"
        ? { streamingSolution1: state.streamingSolution1 + token }
        : { streamingSolution2: state.streamingSolution2 + token }
    ),

  battleModelError: (model, message) =>
    set((state) => ({
      modelErrors: { ...state.modelErrors, [model]: message },
    })),

  // socket event: battle:done  { chatId, turn }
  executeBattleSuccess: ({ chatId, turn }) =>
    set((state) => ({
      isBattleRunning: false,
      isCreatingNewChat: false,
      battleError: null,
      streamStatus: "",
      streamingProblem: "",
      streamingSolution1: "",
      streamingSolution2: "",
      activeChatId: chatId,
      messages: [...state.messages, turn],
    })),

  // socket event: battle:error or api failure
  executeBattleFailure: (error) =>
    set({
      isBattleRunning: false,
      isCreatingNewChat: false,
      battleError: error,
      streamStatus: "",
      streamingProblem: "",
      streamingSolution1: "",
      streamingSolution2: "",
    }),


  // Rename chat
  renameChatSuccess: (updatedSession) =>
    set((state) => ({
      chatSessions: state.chatSessions.map((chat) =>
        chat._id === updatedSession._id ? updatedSession : chat
      ),
      activeSession:
        state.activeSession?._id === updatedSession._id
          ? updatedSession
          : state.activeSession,
    })),


  // Pin / Unpin chat
  pinChatSuccess: (updatedSession) =>
    set((state) => ({
      chatSessions: state.chatSessions.map((chat) =>
        chat._id === updatedSession._id ? updatedSession : chat
      ),
    })),


  // Delete chat
  deleteChatSuccess: (chatId) =>
    set((state) => ({
      chatSessions: state.chatSessions.filter((chat) => chat._id !== chatId),
      ...(state.activeChatId === chatId
        ? { activeChatId: null, activeSession: null, messages: [] }
        : {}),
    })),

});

const useBattleStore = create(
  devtools(battleStore, {
    name: "BattleStore",
    enabled: import.meta.env.DEV,
  })
);

export default useBattleStore;
export { useBattleStore };
