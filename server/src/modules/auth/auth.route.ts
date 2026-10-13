import { Router } from "express";
import {registerController} from "./auth.controller.js"
import {loginController } from "./auth.controller.js"

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




export default authRouter