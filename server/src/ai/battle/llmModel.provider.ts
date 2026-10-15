import { ChatGoogle } from "@langchain/google/node";
import { ChatMistralAI } from "@langchain/mistralai";
import { ChatCohere } from "@langchain/cohere";

import config from "../../config/config.js"

const geminiModel = new ChatGoogle({
  model: "gemini-3.5-flash-lite",
  apiKey: config.GEMINI_API_KEY,
  temperature: 1,
  maxRetries: 2,
});

const mistralModel = new ChatMistralAI({
  model: "ministral-3b-2512",
  apiKey:config.MISTRAL_API_KEY,
  temperature: 1,
  maxRetries: 2,
});

const cohereModel = new ChatCohere({
  model: "command-r7b-12-2024",
  apiKey:config.COHERE_API_KEY,
  temperature: 1,
  maxRetries: 2,
});

export {
    geminiModel,
    mistralModel,
    cohereModel
} 
