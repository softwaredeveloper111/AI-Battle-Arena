import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { cohereModel, geminiModel, mistralModel } from "./llmModel.provider.js";
import {
  StateSchema,
  StateGraph,
  START,
  END,
} from "@langchain/langgraph";
import z from "zod";

const JudgeSchema = z.object({
  solution_1_score: z.number().min(0).max(10).default(0),
  solution_2_score: z.number().min(0).max(10).default(0),
  solution_1_reasoning: z.string().default(""),
  solution_2_reasoning: z.string().default(""),
});

export const BattleHistoryItemSchema = z.object({
  problem: z.string(),
  solution_1: z.string(),
  solution_2: z.string(),
});

export type BattleHistoryItem = z.infer<typeof BattleHistoryItemSchema>;

const AIBattleState = new StateSchema({
  problem: z.string().default(""),
  history: z.array(BattleHistoryItemSchema).default([]),
  solution_1: z.string().default(""),
  solution_2: z.string().default(""),
  judge: JudgeSchema,
});

const judgeModel = geminiModel.withStructuredOutput(JudgeSchema);

const StartNode = async (state: typeof AIBattleState.State) => {
  const problemStatement = state.problem;
  if (!problemStatement) {
    throw new Error("Please provide a problem statement");
  }
  return { problem: problemStatement };
};

const SolutionNode = async (
  state: typeof AIBattleState.State,
  config?: any
) => {
  const problemStatement = state.problem;
  const history = state.history || [];

  config?.writer?.({
    type: "status",
    message: "Generating solutions...",
  });

  // Model 1 (Mistral): user problem aur Model 1 ke past responses
  const mistralMessages = [
    ...history.flatMap((turn) => [
      new HumanMessage(turn.problem),
      new AIMessage(turn.solution_1),
    ]),
    new HumanMessage(problemStatement),
  ];

  // Model 2 (Cohere): user problem aur Model 2 ke past responses
  const cohereMessages = [
    ...history.flatMap((turn) => [
      new HumanMessage(turn.problem),
      new AIMessage(turn.solution_2),
    ]),
    new HumanMessage(problemStatement),
  ];

  // Stream Model 1 (Mistral) token by token
  const streamMistral = async (): Promise<string> => {
    let fullText = "";
    const stream = await mistralModel.stream(mistralMessages);
    for await (const chunk of stream) {
      const text =
        typeof chunk.content === "string"
          ? chunk.content
          : JSON.stringify(chunk.content);
      if (text) {
        fullText += text;
        config?.writer?.({
          type: "token",
          model: "solution_1",
          token: text,
        });
      }
    }
    return fullText;
  };

  // Stream Model 2 (Cohere) token by token
  const streamCohere = async (): Promise<string> => {
    let fullText = "";
    const stream = await cohereModel.stream(cohereMessages);
    for await (const chunk of stream) {
      const text =
        typeof chunk.content === "string"
          ? chunk.content
          : JSON.stringify(chunk.content);
      if (text) {
        fullText += text;
        config?.writer?.({
          type: "token",
          model: "solution_2",
          token: text,
        });
      }
    }
    return fullText;
  };

  // Dono models concurrently stream honge
  const [sol1Text, sol2Text] = await Promise.all([
    streamMistral(),
    streamCohere(),
  ]);

  return { solution_1: sol1Text, solution_2: sol2Text };
};

const compareNode = async (
  state: typeof AIBattleState.State,
  config?: any
) => {
  const solution_1 = state.solution_1;
  const solution_2 = state.solution_2;
  const problemStatement = state.problem;
  const history = state.history || [];

  config?.writer?.({
    type: "status",
    message: "Evaluating solutions...",
  });

  const systemMessage: string = `
  You are an impartial AI Judge. Your task is to evaluate two AI-generated solutions to the same problem.

Evaluate both solutions using these criteria:
1. **Correctness:** Is the solution factually and logically correct?
2. **Relevance:** Does it directly address the problem?
3. **Completeness:** Does it cover all important aspects?
4. **Clarity:** Is it easy to understand?

Rules:
- Evaluate both solutions independently using the same criteria.
- Assign each solution a score from 0 to 10, where 0 is completely incorrect and 10 is excellent.
- Provide concise reasoning for each score.
- Do not favor either solution based on its length, writing style, or model identity.
- Do not assume a solution is correct without evaluating its actual content.
- If both solutions are equally good, assign equal scores.
- Never invent facts to justify a score.

Return only the evaluation in the exact JSON format requested by the application. Include the score and reasoning for each solution.
  `;

  const contextSnippet =
    history.length > 0
      ? `\nRecent Conversation History:\n${history
          .map(
            (turn, index) =>
              `Turn ${index + 1}:\nUser Question: ${turn.problem}\nSolution 1: ${turn.solution_1}\nSolution 2: ${turn.solution_2}`
          )
          .join("\n\n")}\n\n`
      : "";

  const judgment = await judgeModel.invoke([
    new SystemMessage(systemMessage),
    new HumanMessage(`
    ${contextSnippet}Current Problem: ${problemStatement}
    Solution 1:${solution_1}
    Solution 2:${solution_2}
  `),
  ]);

  return { judge: judgment };
};

export const graph = new StateGraph(AIBattleState)
  .addNode("StartNode", StartNode)
  .addNode("SolutionNode", SolutionNode)
  .addNode("compareNode", compareNode)
  .addEdge(START, "StartNode")
  .addEdge("StartNode", "SolutionNode")
  .addEdge("SolutionNode", "compareNode")
  .addEdge("compareNode", END)
  .compile();

export type StreamChunk = {
  type: "updates" | "custom";
  data: any;
};

/**
 * Token-by-token streaming generator using LangGraph streamMode: ["updates", "custom"]
 */
export async function* streamBattleResponse(
  userMessage: string,
  history: BattleHistoryItem[] = []
): AsyncGenerator<StreamChunk> {
  const stream = await graph.stream(
    {
      problem: userMessage,
      history,
      judge: {
        solution_1_score: 0,
        solution_2_score: 0,
        solution_1_reasoning: "",
        solution_2_reasoning: "",
      },
    },
    {
      streamMode: ["updates", "custom"],
    }
  );

  for await (const [mode, data] of stream) {
    yield {
      type: mode as "updates" | "custom",
      data,
    };
  }
}

export default async function generateResponse(
  userMessage: string,
  history: BattleHistoryItem[] = []
) {
  const result = await graph.invoke({
    problem: userMessage,
    history,
    judge: {
      solution_1_score: 0,
      solution_2_score: 0,
      solution_1_reasoning: "",
      solution_2_reasoning: "",
    },
  });
  return result;
}




/**
 * stateSchema is used to define the format(propertiy+data type) of the data which share b/w different nodes
 */
//ex.
// console.log(await generateResponse("are you consious , answer in short"))