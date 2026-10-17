import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import config from "../config/config.js";
import logger from "../lib/logger.js";

let io: Server | undefined;

export function initSocket(httpServer: HttpServer): Server {
  try{
    io = new Server(httpServer,{
      cors: {
        origin: config.FRONTEND_URL,
        credentials:true,
      }
    })
    
  logger.info("Socket.io server is running")

  io.on("connection",(socket)=>{
    logger.info(`Socket connected: ${socket.id}`)

    socket.on("disconnect",()=>{
      logger.info(`Socket disconnected: ${socket.id}`)
    })
  })

    return io;
  } catch (err) {
    logger.error(err);
    throw err;
  }
}

export function getIO(): Server | undefined {
  return io;
}


