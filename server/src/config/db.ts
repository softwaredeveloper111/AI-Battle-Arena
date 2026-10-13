import mongoose from "mongoose";
import logger from "../lib/logger.js"

const connectedToDB = async()=>{
  try {
    await mongoose.connect("mongodb+srv://Dojo-Katana:Souravgiri%401999@cluster-1.wkl7owb.mongodb.net/AI-BATTLE-ARENA");
    logger.info("connected to AI-BATTLE-ARENA database successfully")
  } catch (error) {
    logger.error(error)
    process.exit(1)
  }
}

export default connectedToDB;