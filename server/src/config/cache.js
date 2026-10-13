import Redis from "ioredis"
import config from "../config/config.js"
import logger from "../lib/logger.js"


const redisClient = new Redis(config.REDIS_URL);


redisClient.on('connect',()=>{
    logger.info('Redis client connected successfully')
})


redisClient.on('error',(err)=>{
    logger.error('Error connecting to Redis : ',err)
})


export default redisClient