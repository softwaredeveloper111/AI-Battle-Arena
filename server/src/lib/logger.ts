import pino from "pino";
import config from "../config/config.js";





const logger = pino({
  level: config.LOG_LEVEL,
   transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
      singleLine: false,
    },
  },
  base: {
    service: 'ai-battle-arena',
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      'accessToken',
      'refreshToken',
    ],
    remove: true,
  },
});



export default logger