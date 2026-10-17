import {Router} from "express"
import { executeBattleController } from "../controllers/battle.controller.js";
import {getAllChatSessionsController} from "../controllers/battle.controller.js";
import {getChatMessagesController} from "../controllers/battle.controller.js";

import identifyUser from "../middlewares/identifyUser.middleware.js";
import {executeBattleSchema} from "../validations/battle.validator.js"
import {getChatMessagesSchema} from "../validations/battle.validator.js"
import validate from "../middlewares/validation.middleware.js"

const battleRouter = Router();

/**
 * @description this route is for executing the battle
 * @route POST /api/battle/execute-battle
 * @method POST
 * @access private
 * 
 * @param {string} problem - problem/prompt is required
 * 
 * @returns {object} - 200 battle result
 * @returns {object} - 400 Bad Request
 * @returns {object} - 500 Internal Server Error
 */
battleRouter.post(
    "/execute-battle", 
    validate(executeBattleSchema), 
    identifyUser,  
    executeBattleController
)


/**
 * @description this route is for getting the all chat sessions
 * @route GET /api/battle/chat/history
 * @method GET
 * @access private
 * 
 * @returns {object} - 200 chat sessions
 * @returns {object} - 404 Chat session not found
 * @returns {object} - 500 Internal Server Error
 */
battleRouter.get(
    "/chat/history",
    identifyUser, 
    getAllChatSessionsController
)



/**
 * @description this route is for getting the chat messages by chat id
 * @route GET /api/battle/messages/:chatId
 * @method GET
 * @access private
 * 
 * @param {string} chatId - chat id is required
 * 
 * @returns {object} - 200 chat messages
 * @returns {object} - 404 Chat not found
 * @returns {object} - 500 Internal Server Error
 */
battleRouter.get(
    "/messages/:chatId", 
    validate(getChatMessagesSchema, "params"),
    identifyUser , 
    getChatMessagesController
)







export default battleRouter