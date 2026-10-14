import {Queue} from "bullmq";
import config from "../config/config.js"

const emailQueue = new Queue("email",{
 connection: {
  url:config.REDIS_URL
 }
})


export default emailQueue;