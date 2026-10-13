import app from "./src/app.js";
import config from "./src/config/config.js";
import logger from "./src/lib/logger.js";
import connectedToDB from "./src/config/db.js";

const PORT = config.PORT;

connectedToDB();

app.listen(PORT, () => {
    
  if(config.NODE_ENV === "production")
    logger.info(`Server is running on port ${PORT} in ${config.NODE_ENV} mode`);
  else 
    logger.info(`Server is running on http://localhost:${PORT} in ${config.NODE_ENV} mode`);
});