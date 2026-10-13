import jwt from "jsonwebtoken";
import crypto from "crypto";
import userModel from "../../modules/auth/user.model.js";
import ApiError from "../utils/ApiError.util.js";
import config from "../../config/config.js"
import redisClient from "../../config/cache.js"
import logger from "../../lib/logger.js";

import type {Request,Response,NextFunction} from "express"


declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

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
     
 
    const userId = typeof decoded !== "string" ? decoded.id : undefined;


    if (typeof decoded === "string" || !userId) {
      throw new ApiError("Invalid token payload",401)
    }

    const user = await userModel.findById(userId);
    if (!user){
      throw new ApiError("User not found",404)
    }

    req.user = user;
    next();
    
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