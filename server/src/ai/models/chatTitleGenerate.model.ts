import config from "../../config/config.js"
import { ChatMistralAI } from "@langchain/mistralai";

/**
 * this llm model only for generate chat title
 */
const titleModel = new ChatMistralAI({
  model: "ministral-3b-2512",
  apiKey: config.MISTRAL_API_KEY,
  temperature: 0.2,
  maxTokens: 25,
  maxRetries: 0,
});


export default titleModel