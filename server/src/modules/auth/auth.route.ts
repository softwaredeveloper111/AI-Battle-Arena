import { Router } from "express";
import {registerController} from "./auth.controller.js"
import {loginController } from "./auth.controller.js";
import {verifyLinkController} from "./auth.controller.js";
import {resendVerificationLinkController} from "./auth.controller.js"
import {forgotPasswordController} from "./auth.controller.js";
import {resetPasswordController} from "./auth.controller.js";
import {getMeController} from "./auth.controller.js"
import {logoutController} from "./auth.controller.js"

import identifyUser from "../../shared/middlewares/identifyUser.middleware.js"



const authRouter = Router();



/**
 * @description  register new user
 * @route POST /api/auth/register
 * @access public
 * 
 * @param  {string} req.body.username - username for the new user
 * @param  {string} req.body.email - email for the new user
 * @param  {string} req.body.password - password for the new user
 * 
 * @returns {Object} 201 created user object
 * @returns {Object} 400 invalid request body
 * @returns {Object} 409 username or email already exists
 */

authRouter.post("/register",registerController);





/**
 * @description login a user and get jwt token
 * @route POST /api/auth/login
 * @access public
 * 
 * @param {string} req.body.email - email for the user
 * @param {string} req.body.password - password for the user
 * 
 * @returns {Object} 200 logged in user object
 * @returns {Object} 400 invalid request body
 * @returns {Object} 404 user not found
 * @returns {Object} 401 invalid password
 * @returns {Object} 403 email not verified
 */

authRouter.post("/login",loginController);




/**
 * 
 * @description verify email link
 * @route GET /api/auth/verify-email
 * @access public
 * 
 * @param {string} req.query.token - token for email verification
 * 
 * @returns {Object} 200 email verified successfully
 * @returns {Object} 401 invalid token
 * @returns {Object} 404 user not found
 * @returns {Object} 403 email already verified
 * 
 */
authRouter.get("/verify-email", verifyLinkController);





/**
 * @description resend verification link
 * @route POST /api/auth/resend-verification-link
 * @access public
 * 
 * @param {string} req.body.email - email for the user
 * 
 * @returns {Object} 200 email verification link sent successfully
 * @returns {Object} 400 invalid email
 * @returns {Object} 404 user not found
 * @returns {Object} 403 email already verified
 * 
 */
authRouter.post("/resend-verification-link",resendVerificationLinkController)






/**
 * @description forgot password
 * @route POST /api/auth/forgot-password
 * @access public
 * 
 * @param {string} req.body.email - email for the user
 * 
 * @returns {Object} 200 password reset link sent successfully
 * @returns {Object} 400 invalid email
 * @returns {Object} 404 user not found
 * 
 */
authRouter.post("/forgot-password",forgotPasswordController)




/**
 * @description reset password
 * @route POST /api/auth/reset-password
 * @access public
 * 
 * @param {string} req.body.token - token for password reset
 * @param {string} req.body.password - new password for the user

 * 
 * @returns {Object} 200 password reset successfully
 * @returns {Object} 400 invalid token
 * @returns {Object} 404 user not found
 * @returns {Object} 401 invalid password
 * 
 */
authRouter.post("/reset-password",resetPasswordController)





/**
 * @description get current user
 * @route GET /api/auth/me
 * @access protected
 * 
 * @returns {Object} 200 user object
 * @returns {Object} 401 unauthorized
 * 
 */
authRouter.get("/me", identifyUser ,  getMeController)




/**
 * @description logout a user
 * @route POST /api/auth/logout
 * @access protected
 * 
 * @returns {Object} 200 user logged out successfully
 * @returns {Object} 401 unauthorized
 * 
 */
authRouter.post("/logout", identifyUser , logoutController)



export default authRouter