import app from "./src/app.js";
import config from "./src/config/config.js";
import logger from "./src/lib/logger.js";
import connectedToDB from "./src/config/db.js";
import "./src/config/cache.js";

import "./src/workers/main.js";

import { initSocket } from "./src/socket/server.socket.js";
import {createServer} from "http"

const httpServer = createServer(app)
const PORT = config.PORT;

connectedToDB();
initSocket(httpServer);

httpServer.listen(PORT, () => {
    
  if(config.NODE_ENV === "production")
    logger.info(`Server is running on port ${PORT} in ${config.NODE_ENV} mode`);
  else 
    logger.info(`Server is running on http://localhost:${PORT} in ${config.NODE_ENV} mode`);
});