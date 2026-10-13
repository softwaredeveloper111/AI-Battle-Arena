import  asyncWrapper from "../../shared/utils/AsyncWrapper.util.js";
import ApiError from "../../shared/utils/ApiError.util.js";
import ApiResponse from "../../shared/utils/ApiResponse.util.js";
import userModel from "./user.model.js"
import type {Request,Response} from "express"
import jwt from "jsonwebtoken"
import config from "../../config/config.js";
import crypto from "crypto"
import redisClient from "../../config/cache.js"
import sendEmail from "../../shared/services/email.service.js"

import verificationEmailTemplate from "../../shared/template/emailVerification.template.js";
import invalidVerificationEmailTemplate from "../../shared/template/invalidVerificationEmail.template.js";
import alreadyEmailVerifiedTemplate from "../../shared/template/alreadyVerifiedEmail.template.js";
import expiredVerificationEmailTemplate from "../../shared/template/expiredEmailVerification.template.js";
import afterEmailVerfiedTemplate from "../../shared/template/afterVerifiedEmail.template.js"
import forgotPasswordEmailTemplate from "../../shared/template/forgotPasswordEmailTemplate.js"



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

   const emailVerificationTokenHash =  crypto.createHash("sha256").update(emailVerificationToken).digest("hex");
   
   await redisClient.set(
     `email-verification:${user._id}`,
     emailVerificationTokenHash,
     "EX", 300
   )


   await sendEmail(
        email,
        "[AI-BATTLE-ARENA] Verify your email address",
        verificationEmailTemplate({
          username,
          emailVerificationToken,
        })
    );

   return ApiResponse(res,201,"User created successfully and email verification link sent",user)

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
    id:user._id,
  },config.JWT_SECRET_KEY,{
    expiresIn:"1d"
  });

  res.cookie("token",token, cookieOptions)
  
  return ApiResponse(res,200,"User logged in successfully", user)

})






export const verifyLinkController = asyncWrapper(async (req:Request, res:Response) => {
  const token = req.query?.token;

  if (!token || typeof token !== "string") {
    return res.status(400).send(invalidVerificationEmailTemplate());
  }

  let decoded;
  try {

    decoded = jwt.verify(
      token,
      config.EMAIL_VERIFICATION_SECRET_KEY
    );
    
  } catch (error:unknown) {
     if (error instanceof Error && error.name === "TokenExpiredError"){
      return res.status(401).send(expiredVerificationEmailTemplate());
    }

    return res.status(401).send(invalidVerificationEmailTemplate());
  }

 
  if (typeof decoded === "string" || !decoded.id) {
    return res.status(401).send(invalidVerificationEmailTemplate());
  }

  const user = await userModel.findById(decoded.id);

  if (!user) {
    return res.status(404).send(invalidVerificationEmailTemplate());
  }


  if (user.emailVerified) {
    return res.status(403).send(alreadyEmailVerifiedTemplate());
  }

  const tokenHash = crypto
  .createHash("sha256")
  .update(token)
  .digest("hex");

   const getRedisHashToken = await redisClient.get(
  `email-verification:${decoded.id}`
);

if (!getRedisHashToken || (getRedisHashToken !== tokenHash)) {
  return res.status(401).send(
    invalidVerificationEmailTemplate()
  );
}

  user.emailVerified = true;
  await user.save();

  await redisClient.del(`email-verification:${decoded.id}`);

  return res.status(200).send(afterEmailVerfiedTemplate());
});






export const resendVerificationLinkController = asyncWrapper(async(req:Request,res:Response)=>{

   const {email} = req.body;

   if (!email || typeof email !== "string"){
    throw new ApiError("Invalid email",400)
   }
  
   const isEmailRegistered = await userModel.findOne({email});
   if(!isEmailRegistered){
    throw new ApiError("user not found",404)
   }

   const isEmailAlreadyVerified = isEmailRegistered.emailVerified ;
   if(isEmailAlreadyVerified){
    throw new ApiError("user already verified",400)
   }
   

   const emailVerificationToken = jwt.sign({
    id:isEmailRegistered._id
   },config.EMAIL_VERIFICATION_SECRET_KEY,{
    expiresIn:"5m"
   });

   const emailVerificationTokenHash =  crypto.createHash("sha256").update(emailVerificationToken).digest("hex");
   
   await redisClient.set(
     `email-verification:${isEmailRegistered._id}`,
     emailVerificationTokenHash,
     "EX", 300
   )


   await sendEmail(
        email,
        "[AI-BATTLE-ARENA] Verify your email address",
        verificationEmailTemplate({
          username:isEmailRegistered?.username,
          emailVerificationToken,
        })
    );

  return ApiResponse(res,200,"email verification link sent successfully",null)


})






export const forgotPasswordController = asyncWrapper(async(req:Request,res:Response)=>{
  
  const email = req.body?.email;

  if (!email || typeof email !== "string"){
    throw new ApiError("Invalid email",400)
  }

  const user = await userModel.findOne({email});

  if(!user){
   return ApiResponse(res,404, "user not found",null)
  }

  const resetPasswordToken = jwt.sign(
    {
      id: user._id,
    },
    config.RESET_PASSWORD_SECRET_KEY,
    { 
      expiresIn: "5m" 
    },
  );
  
   const resetPasswordTokenHash = crypto
    .createHash("sha256")
    .update(resetPasswordToken)
    .digest("hex");


   await redisClient.set(
  `password-reset:user:${user._id}`,
  resetPasswordTokenHash,
  "EX",
  300
);
    const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${resetPasswordToken}`;
  
  await sendEmail(
    user.email,
    "Password Reset",
    forgotPasswordEmailTemplate({
      username:user.username,
      resetUrl
    })
  )
  
  return ApiResponse(res,200,"password reset link sent successfully",null);
})





export const resetPasswordController =  asyncWrapper(async(req:Request,res:Response)=>{
 
  
  const token = req.body?.token;
  const password = req.body?.password;

  if(!token || typeof token !== "string" || !password || typeof password !== "string"){
    throw new ApiError("Invalid request body",400)
  }

  let decoded;

  try {
    decoded = jwt.verify(
      token,
      config.RESET_PASSWORD_SECRET_KEY
    );
  } catch (error:unknown){
    if(error instanceof Error && error.name === "TokenExpiredError"){
      throw new ApiError("expired reset token", 400);
    }
    throw new ApiError("Invalid reset token", 400);
  }

  if (typeof decoded === "string" || !decoded?.id) {
    throw new ApiError("Invalid reset token", 400);
  }


  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const getRedisHashedToken = await redisClient.get(
  `password-reset:user:${decoded.id}`
);

   if (!getRedisHashedToken || (getRedisHashedToken !== tokenHash)) {
  throw new ApiError("Invalid  reset token", 400);
}

  const user = await userModel.findById(decoded.id);

  if (!user) {
    throw new ApiError("user not found", 404);
  }

  user.password = password;
  await user.save();

  await redisClient.del(`password-reset:user:${decoded.id}`);

  return ApiResponse(res,200,"Password reset successfully",user)

})





export const getMeController = asyncWrapper(async(req:Request,res:Response)=>{
  const user = req.user;
  return ApiResponse(res,200,"user get successfully",user);
})






export const logoutController =  asyncWrapper(async(req:Request,res:Response)=>{
  
  const token = req.cookies?.token;
  const userId = req.user?._id;

  if (!token || typeof token !== "string") {
    throw new ApiError("Token not found", 401);
  }

  const createTokenHash = crypto
  .createHash("sha256")
  .update(token)
  .digest("hex");
   

  const decoded = jwt.verify(token, config.JWT_SECRET_KEY);

  if (typeof decoded === "string" || !decoded.exp) {
    throw new ApiError("Invalid token payload", 400);
  }

  const remainingTTL = decoded.exp - Math.floor(Date.now() / 1000);

  if (remainingTTL > 0) {
    await redisClient.set(`blacklist:token:${createTokenHash}`, "1", "EX", remainingTTL);
  }
  
  /** delete user cache -  cache invalidation */
  if (userId) {
    await redisClient.del(`user:${userId}`);
  }

  res.clearCookie("token", cookieOptions);
  return ApiResponse(res,200,"user logout successfully",null);
  
});  