import {Router} from "express"
import { executeBattleController } from "../controllers/battle.controller.js";
const battleRouter = Router();

import identifyUser from "../middlewares/identifyUser.middleware.js";
import {executeBattleSchema} from "../validations/battle.validator.js"
import validate from "../middlewares/validation.middleware.js"



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








export default battleRouter