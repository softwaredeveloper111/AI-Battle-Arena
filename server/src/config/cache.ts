import {Redis} from "ioredis"
import config from "./config.js"
import logger from "../lib/logger.js"


const redisClient = new Redis(config.REDIS_URL);


redisClient.on('connect',()=>{
    logger.info('Redis client connected successfully')
})


redisClient.on('error',(err:Error)=>{
      logger.error({ err }, "Error connecting to Redis");
})


export default redisClient