import  asyncWrapper from "../../shared/utils/AsyncWrapper.util.js";
import ApiError from "../../shared/utils/ApiError.util.js";
import ApiResponse from "../../shared/utils/ApiResponse.util.js";
import userModel from "./user.model.js"
import type {Request,Response} from "express"
import jwt from "jsonwebtoken"
import config from "../../config/config.js";
import crypto from "crypto"




type CookieOptions= {
  httpOnly:boolean,
  secure:boolean,
  sameSite:"strict" | "none" | "lax",
  maxAge:number,
  path:string
}

const cookieOptions:CookieOptions = {
  httpOnly:true,
  secure:config.NODE_ENV === "production",
  sameSite:config.NODE_ENV === "development"?"strict":"none",
  maxAge:1000*60*60*24,
  path: "/",
}


export const registerController = asyncWrapper(async(req:Request,res:Response)=>{
 
   const username = req.body?.username;
   const email = req.body?.email;
   const password = req.body?.password;
   
   if(!username || !email || !password){
    throw new ApiError("All fields are required",400)
   }

   const userExists = await userModel.findOne({
    $or: [{email}, {username}]
   })

   if(userExists){
    throw new ApiError("User already exists",409)
   }
  
   const user = await userModel.create({
    username,
    email,
    password
   })

   if(!user){
    throw new ApiError("User not created",500)
   }


   const emailVerificationToken = jwt.sign({
    id:user._id
   },config.EMAIL_VERIFICATION_SECRET_KEY,{
    expiresIn:"5m"
   });

   const emailVerificationTokenHash =  crypto.createHash("sha256").update(emailVerificationToken).digest("hex")


   return ApiResponse(res,201,"User created successfully",user)

})



export const loginController = asyncWrapper(async(req:Request,res:Response)=>{

  const {email,password} = req.body;
  
  if(!email || !password){
    throw new ApiError("All fields are required",400)
  }

  const user = await userModel.findOne({
    email
  }).select("+password")

  if(!user){
    throw new ApiError("User not found",404)
  }

  const isPasswordValid = await user.comparePassword(password)

  if(!isPasswordValid){
    throw new ApiError("Invalid password",401)
  }

  const isEmailVerified = user.emailVerified;

  if(!isEmailVerified){
    throw new ApiError("Email not verified",403)
  }

  /**
   * geenrate jwt token
   */

  const token = jwt.sign({
    _id:user._id,
  },config.JWT_SECRET_KEY,{
    expiresIn:"1d"
  });

  res.cookie("token",token, cookieOptions)
  
  return ApiResponse(res,200,"User logged in successfully", user)

})


