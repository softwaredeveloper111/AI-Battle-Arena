import {rateLimit} from "express-rate-limit";
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
  limit:10,
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
  limit:5,
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
  limit:3,
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
  limit: 3,

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
