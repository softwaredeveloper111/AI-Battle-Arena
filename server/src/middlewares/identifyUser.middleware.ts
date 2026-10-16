import jwt from "jsonwebtoken";
import crypto from "crypto";
import userModel from "../models/user.model.js";
import ApiError from "../utils/ApiError.util.js";
import config from "../config/config.js";
import redisClient from "../config/cache.js";
import logger from "../lib/logger.js";

import type { Request, Response, NextFunction } from "express";



 const identifyUser = async(req:Request,res:Response,next:NextFunction)=>{
  try {
    

    /** get the token */
    const token = req.cookies?.token;
  
    if(!token || typeof token !== "string"){
      throw new ApiError("unthorized access !! token not found",401)
    }
 
  /** hash the token before check into blacklist redis store */
  const tokenHash = crypto
  .createHash("sha256")
  .update(token)
  .digest("hex");

const isBlacklisted = await redisClient.get(
  `blacklist:token:${tokenHash}`
);

if (isBlacklisted) {
  throw new ApiError("unthorized access!! invalid token !! blacklisted token",401)
}

  
  /** verify jwt */
    const decoded = jwt.verify(token,config.JWT_SECRET_KEY);

    const userId = typeof decoded !== "string" ? decoded?.id : undefined;

    if (typeof decoded === "string" || !userId) {
      throw new ApiError("Invalid token payload",401)
    }
  
    const cacheKey = `user:profile:${userId}`;

     /** check for the data in redis cached storage */
    const CachedUserAlreadyExists = await redisClient.get(cacheKey);

    /** cache hit */
    if(CachedUserAlreadyExists){
      logger.info("Cache Hit ⚡");
      const cachedUser = JSON.parse(CachedUserAlreadyExists);
       
      if(cachedUser === null){
        throw new ApiError("user not found",404)
      }

      req.user = cachedUser
      return next();
    }

    /** cache miss */
     logger.info(`Cache Miss❌`);
    /** cache miss - fetch data from database */
     const user = await userModel.findById(userId).lean();

    if(!user){
      // Negative cache: user doesn't exist - cached null value (part of system design)
      await redisClient.set(cacheKey,"null","EX",60);

      throw new ApiError("user not found",404)
    }

    /** return  user  data from db,  save in redis with 5 min TTL */
    await redisClient.set(cacheKey,JSON.stringify(user),"EX",300) 

    req.user = user;
    next()

  } catch (error:unknown) {
     if (
      error instanceof Error && 
      (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError")
    ) {
      return next(
        new ApiError("Invalid or expired token", 401)
      );
    }

    return next(error);
  }
  
}


export default identifyUser