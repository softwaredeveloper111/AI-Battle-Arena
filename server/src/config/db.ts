import mongoose from "mongoose";
import logger from "../lib/logger.js";
import config from "./config.js";

const connectedToDB = async () => {
  try {
    await mongoose.connect(config.MONGO_URI);
    logger.info("connected to AI-BATTLE-ARENA database successfully");
  } catch (error: unknown) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      "Connection problem with database ❌",
    );
    process.exit(1);
  }
};

export default connectedToDB;
