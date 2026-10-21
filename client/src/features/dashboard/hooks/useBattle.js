import { useCallback } from "react";
import { toast } from "sonner";
import useBattleStore from "../store/battle.store";
import battleService from "../services/battle.api";
import { initializeSocketConnection } from "../../../services/sockets/client.socket";

/**
 * Smooth streaming: LLM tokens arrive very fast (many per second).
 * Instead of updating the store on every token, we collect them in a buffer
 * and push to the store once per animation frame (max ~60 renders/sec).
 * Buffer is module level because the socket listener is registered only once.
 */
let tokenBuffer = { solution_1: "", solution_2: "" };
let frameId = null;

const flushTokens = () => {
  frameId = null;
  const { battleTokenReceived } = useBattleStore.getState();

  ["solution_1", "solution_2"].forEach((model) => {
    if (tokenBuffer[model]) {
      battleTokenReceived(model, tokenBuffer[model]);
      tokenBuffer[model] = "";
    }
  });
};

const resetTokenBuffer = () => {
  if (frameId) {
    cancelAnimationFrame(frameId);
    frameId = null;
  }
  tokenBuffer = { solution_1: "", solution_2: "" };
};

const useBattle = () => {
  // --- Battle State from Zustand Store ---
  const chatSessions = useBattleStore((state) => state.chatSessions);
  const chatSessionsLoading = useBattleStore((state) => state.chatSessionsLoading);
  const chatSessionsError = useBattleStore((state) => state.chatSessionsError);

  const activeChatId = useBattleStore((state) => state.activeChatId);
  const activeSession = useBattleStore((state) => state.activeSession);
  const messages = useBattleStore((state) => state.messages);
  const messagesLoading = useBattleStore((state) => state.messagesLoading);
  const messagesError = useBattleStore((state) => state.messagesError);

  const socketId = useBattleStore((state) => state.socketId);
  const isBattleRunning = useBattleStore((state) => state.isBattleRunning);
  const battleError = useBattleStore((state) => state.battleError);
  const streamStatus = useBattleStore((state) => state.streamStatus);
  const streamingProblem = useBattleStore((state) => state.streamingProblem);
  const streamingSolution1 = useBattleStore((state) => state.streamingSolution1);
  const streamingSolution2 = useBattleStore((state) => state.streamingSolution2);
  const modelErrors = useBattleStore((state) => state.modelErrors);

  // --- Store Actions ---
  const setSocketId = useBattleStore((state) => state.setSocketId);
  const setActiveChatId = useBattleStore((state) => state.setActiveChatId);

  const fetchChatSessionsStart = useBattleStore((state) => state.fetchChatSessionsStart);
  const fetchChatSessionsSuccess = useBattleStore((state) => state.fetchChatSessionsSuccess);
  const fetchChatSessionsFailure = useBattleStore((state) => state.fetchChatSessionsFailure);

  const fetchMessagesStart = useBattleStore((state) => state.fetchMessagesStart);
  const fetchMessagesSuccess = useBattleStore((state) => state.fetchMessagesSuccess);
  const fetchMessagesFailure = useBattleStore((state) => state.fetchMessagesFailure);
  const clearMessages = useBattleStore((state) => state.clearMessages);

  const executeBattleStart = useBattleStore((state) => state.executeBattleStart);
  const executeBattleSuccess = useBattleStore((state) => state.executeBattleSuccess);
  const executeBattleFailure = useBattleStore((state) => state.executeBattleFailure);
  const battleStatusReceived = useBattleStore((state) => state.battleStatusReceived);
  const battleModelError = useBattleStore((state) => state.battleModelError);

  const renameChatSuccess = useBattleStore((state) => state.renameChatSuccess);
  const pinChatSuccess = useBattleStore((state) => state.pinChatSuccess);
  const deleteChatSuccess = useBattleStore((state) => state.deleteChatSuccess);

  // --- Handlers Merging API + State ---

  /**
   * Call this ONCE (Dashboard mount). Connects the socket, keeps socketId in store
   * and listens to "battle:stream". Returns a cleanup function for useEffect.
   */
  const connectBattleSocket = useCallback(() => {
    const socket = initializeSocketConnection();

    const onConnect = () => setSocketId(socket.id);
    const onDisconnect = () => setSocketId(null);

    const onStream = (data) => {
      if (data?.type === "token") {
        tokenBuffer[data.model] = (tokenBuffer[data.model] || "") + data.token;
        if (!frameId) frameId = requestAnimationFrame(flushTokens);
      } else if (data?.type === "status") {
        battleStatusReceived(data.message);
      } else if (data?.type === "model_error") {
        battleModelError(data.model, data.message);
      }
    };

    const onError = (data) => {
      resetTokenBuffer();
      const message = data?.message || "Battle encountered an error";
      executeBattleFailure(message);
      toast.error(message);
    };

    if (socket.connected && socket.id) setSocketId(socket.id);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("battle:stream", onStream);
    socket.on("battle:error", onError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("battle:stream", onStream);
      socket.off("battle:error", onError);
      resetTokenBuffer();
    };
  }, [setSocketId, battleStatusReceived, battleModelError, executeBattleFailure]);

  const executeBattleHandler = useCallback(
    async (problem, chatId = null) => {
      // latest value from store or connected socket instance (avoids null socketId)
      const currentSocketId =
        useBattleStore.getState().socketId || initializeSocketConnection()?.id;

      resetTokenBuffer();
      executeBattleStart(problem);
      try {
        const result = await battleService.executeBattleApi(
          problem,
          chatId,
          currentSocketId
        );

        // drop any token still waiting for next frame, final text comes from DB turn
        resetTokenBuffer();
        executeBattleSuccess(result?.data);

        // refresh sidebar chat sessions
        const history = await battleService.getAllChatSessionsApi();
        fetchChatSessionsSuccess(history?.data);
        return result;
      } catch (err) {
        resetTokenBuffer();
        const message = err?.message || "Battle failed, please try again";
        executeBattleFailure(message);
        toast.error(message);
        return null;
      }
    },
    [
      executeBattleStart,
      executeBattleSuccess,
      executeBattleFailure,
      fetchChatSessionsSuccess,
    ]
  );

  const fetchChatSessionsHandler = useCallback(async () => {
    fetchChatSessionsStart();
    try {
      const result = await battleService.getAllChatSessionsApi();
      fetchChatSessionsSuccess(result?.data);
      return result;
    } catch (err) {
      const message = err?.message || "Failed to load chat history";
      fetchChatSessionsFailure(message);
      toast.error(message);
      return null;
    }
  }, [fetchChatSessionsStart, fetchChatSessionsSuccess, fetchChatSessionsFailure]);

  const fetchMessagesHandler = useCallback(
    async (chatId) => {
      setActiveChatId(chatId);
      fetchMessagesStart();
      try {
        const result = await battleService.getChatMessagesApi(chatId);
        fetchMessagesSuccess(result?.data);
        return result;
      } catch (err) {
        const message = err?.message || "Failed to load chat messages";
        fetchMessagesFailure(message);
        toast.error(message);
        return null;
      }
    },
    [setActiveChatId, fetchMessagesStart, fetchMessagesSuccess, fetchMessagesFailure]
  );

  const renameChatHandler = useCallback(
    async (chatId, title) => {
      try {
        const result = await battleService.renameChatSessionApi(chatId, title);
        renameChatSuccess(result?.data);
        toast.success(result?.message || "Chat renamed successfully");
        return result;
      } catch (err) {
        toast.error(err?.message || "Failed to rename chat");
        return null;
      }
    },
    [renameChatSuccess]
  );

  const pinChatHandler = useCallback(
    async (chatId) => {
      try {
        const result = await battleService.pinnedChatSessionApi(chatId);
        pinChatSuccess(result?.data);
        // pinned chats move to top, so reload the ordered list
        const history = await battleService.getAllChatSessionsApi();
        fetchChatSessionsSuccess(history?.data);
        return result;
      } catch (err) {
        toast.error(err?.message || "Failed to pin chat");
        return null;
      }
    },
    [pinChatSuccess, fetchChatSessionsSuccess]
  );

  const deleteChatHandler = useCallback(
    async (chatId) => {
      try {
        const result = await battleService.deleteChatSessionApi(chatId);
        deleteChatSuccess(chatId);
        toast.success(result?.message || "Chat deleted successfully");
        return result;
      } catch (err) {
        toast.error(err?.message || "Failed to delete chat");
        return null;
      }
    },
    [deleteChatSuccess]
  );

  return {
    chatSessions,
    chatSessionsLoading,
    chatSessionsError,

    activeChatId,
    activeSession,
    messages,
    messagesLoading,
    messagesError,

    socketId,
    isBattleRunning,
    battleError,
    streamStatus,
    streamingProblem,
    streamingSolution1,
    streamingSolution2,
    modelErrors,

    connectBattleSocket,
    executeBattleHandler,
    fetchChatSessionsHandler,
    fetchMessagesHandler,
    renameChatHandler,
    pinChatHandler,
    deleteChatHandler,
    clearMessages,
    setActiveChatId,
  };
};

export default useBattle;
