import axiosInstance from "../../../services/api/axios";



const battleService = {


  executeBattleApi: async (problem, chatId, socketId) => {
    const payload = { problem }
    if (chatId) payload.chatId = chatId
    if (socketId) payload.socketId = socketId

    const res = await axiosInstance.post('/api/battle/execute-battle', payload, {
      timeout: 120000,
    })
    return res.data
  },

   getAllChatSessionsApi: async()=>{
    const res = await axiosInstance.get(`/api/battle/chat/history`);
    return res.data
   },

   getChatMessagesApi: async(chatId)=>{
    const res = await axiosInstance.get(`/api/battle/messages/${chatId}`);
    return res.data
   },

   renameChatSessionApi: async(chatId, title)=>{
    const res = await axiosInstance.patch(`/api/battle/rename/${chatId}`, {title});
    return res.data
   },

   deleteChatSessionApi: async(chatId)=>{
    const res = await axiosInstance.delete(`/api/battle/delete/${chatId}`);
    return res.data
   },

   pinnedChatSessionApi: async(chatId)=>{
    const res = await axiosInstance.patch(`/api/battle/pinned/${chatId}`);
    return res.data
   },

}


export default battleService
