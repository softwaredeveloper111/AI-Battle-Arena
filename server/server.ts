import app from "./src/app.js";
import config from "./src/config/config.js";
import logger from "./src/lib/logger.js";


const PORT = config.PORT;


app.listen(PORT, () => {
    
  if(config.NODE_ENV === "production")
    logger.info(`Server is running on port ${PORT} in ${config.NODE_ENV} mode`);
  else 
    logger.info(`Server is running on http://localhost:${PORT} in ${config.NODE_ENV} mode`);
});