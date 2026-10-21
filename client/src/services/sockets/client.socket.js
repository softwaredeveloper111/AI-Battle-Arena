import { io } from "socket.io-client";

let socket = null;

/** one shared socket for the whole app (calling it again returns the same socket) */
export const initializeSocketConnection = ()=>{
  if (socket) return socket;

  socket = io(import.meta.env.VITE_BACKEND_API, {
    withCredentials:true
  });
  
  socket.on("connect",()=>{
    console.log("Connected to Socket.IO server")
  })

  return socket;
}