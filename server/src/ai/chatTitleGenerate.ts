import titleModel from "./models/chatTitleGenerate.model.js";
import { SystemMessage } from "@langchain/core/messages";
import { HumanMessage } from "@langchain/core/messages";
import logger from "./../lib/logger.js"

const TITLE_MAX_ATTEMPTS = 2;
const TITLE_TIMEOUT_MS = 5_000;
const DEFAULT_TITLE = "New Chat";

const TITLE_PROMPT = `Write a 2-4 word title for the user's message.
Return only the title. No punctuation, no quotes, no explanation.

Example: "What is React and how does it work?" -> React Fundamentals
Example: "How does JWT auth work in Node.js?" -> Node.js JWT Authentication`;


/** Mistral/LangChain response chahe plain string ho ya block array, usme se clean text nikalta hai. */ 
function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => {
        if (typeof c === "string") return c;
        if (c && typeof c === "object" && "text" in c && typeof (c as { text: unknown }).text === "string") {
          return (c as { text: string }).text;
        }
        return "";
      })
      .join("");
  }
  return "";
}



/** Output se extra quotes (""), bullets (1., -), punctuation aur faltu spaces hatata hai. */
function sanitizeTitle(raw:string) {
  const firstLine = String(raw ?? "").trim().split("\n")[0] ?? "";
  return firstLine
    .replace(/^\s*(\d+[.)]|[-*•])\s*/, "")
    .replace(/[^\p{L}\p{N}\s.#+-]/gu, "")
    .replace(/\.+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}


const wordsOf = (s: string) => (s ? s.trim().split(/\s+/).filter(Boolean) : []);

/** LLM fail ho gaya? user message ke pehle 4 words hi title bana do */
function fallbackTitle(message:string) {
  const words = wordsOf(sanitizeTitle(message)).slice(0, 4);
  return words.length ? words.join(" ") : DEFAULT_TITLE;
}



export default async function generateChatTitle(message:string) {
  const signal = AbortSignal.timeout(TITLE_TIMEOUT_MS);
  let lastWordCount = 0;
  let lastTitle = "";

  for (let attempt = 1; attempt <= TITLE_MAX_ATTEMPTS; attempt++) {
    try {
      // har attempt fresh call, history append nahi. Retry pe sirf ek extra line
      const system =
        attempt === 1
          ? TITLE_PROMPT
          : `${TITLE_PROMPT}\nPrevious output had ${lastWordCount} words. Return 2 to 4 words only.`;

      const res = await titleModel.invoke(
        [new SystemMessage(system), new HumanMessage(message)],
        { signal }
      );

      const title = sanitizeTitle(extractText(res.content));
      const words = wordsOf(title);
      lastTitle = title;
      lastWordCount = words.length;

      if (words.length >= 2 && words.length <= 4) return title;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn({ attempt, error: errorMessage }, "title generation attempt failed");
      if (signal.aborted) break; // 5s khatam, aage mat jao
    }
  }

  // 4 se zyada words the? truncate karke use karo. Warna message se fallback
  const truncated = wordsOf(lastTitle).slice(0, 4);
  return truncated.length >= 2 ? truncated.join(" ") : fallbackTitle(message);
}