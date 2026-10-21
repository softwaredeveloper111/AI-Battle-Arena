import {rateLimit, ipKeyGenerator} from "express-rate-limit";
import {RedisStore , type RedisReply} from "rate-limit-redis";
import redisClient from "../config/cache.js";
import config from "../config/config.js";
import type{Request} from "express"


const createRedisStore = (prefix:string)=>{
 return  new RedisStore({
    prefix,
    sendCommand:(...args:string[])=>
      redisClient.call(args[0]! , ...args.slice(1)) as Promise<RedisReply>
  })
}



/**
 * global rate limist
 * used in routes where ip-based rate limiting is required
 */
export const globalRateLimit = rateLimit({
  windowMs:15*60*1000,
  limit:300,
  store:createRedisStore("global-rate-limit:"),
  message:{
    success:false,
    statusCode:429,
    message:"too many request , please try again later"
  }
})


/**
 * auth rate limit
 * used in routes where auth-based rate limiting is required
 */
export const authRateLimit = rateLimit({
  windowMs:15*60*1000,
  limit:20,
  store:createRedisStore("auth-rate-limit:"),
  message:{
    success:false,
    statusCode:429,
    message:"too many request , please try again later"
  }
})



/**
 * reset-password rate limit
 * used in /api/auth/reset-password
 */
export const resetPasswordRateLimit = rateLimit({
  windowMs:15*60*1000,
  limit:15,
  store:createRedisStore("reset-password-rate-limit:"),
  message:{
    success:false,
    statusCode:429,
    message:"too many request , please try again later"
  }
})




/**
 * Resend email ip based rate limit
 * used in /api/auth//resend-verification-link and /api/auth/forgot-password
 */

export const resendEmailRateLimit = rateLimit({
  windowMs:15*60*1000,
  limit:10,
  store:createRedisStore("resend-email-rate-limit:"),
  message:{
    success:false,
    statusCode:429,
    message:"too many request , please try again later"
  }
})


/**
 * email bases rate limiting
 * used in email based routes
 * like /api/auth//resend-verification-link and /api/auth/forgot-password
 */

export const emailRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,

  keyGenerator: (req: Request) => {
    return req.body?.email?.toLowerCase().trim() || "unknown";
  },

  store: createRedisStore("email-rate-limit:"),

  message: {
    success: false,
    statusCode: 429,
    message: "too many requests, please try again later",
  },
});



const userKey = (req: Request) => {
  const userId = (req.user as any)?._id;
  if (userId) return userId.toString();
  return req.ip ? ipKeyGenerator(req.ip) : "unknown";
};

export const messageBurstLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  keyGenerator: userKey,
  validate: { keyGeneratorIpFallback: false },
  skipFailedRequests: true,
  passOnStoreError: true, // Redis down ho to request block na ho
  store: createRedisStore("rl:msg:min:"),
  message: {
    success: false,
    statusCode: 429,
    message: "You're sending messages too fast. Please wait a moment.",
  },
});




export const messageDailyLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 50,
  keyGenerator: userKey,
  validate: { keyGeneratorIpFallback: false },
  skipFailedRequests: true,
  passOnStoreError: true,
  store: createRedisStore("rl:msg:day:"),
  message: {
    success: false,
    statusCode: 429,
    message: "You've reached today's message limit. Please come back tomorrow.",
  },
});

