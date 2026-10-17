import mongoose, { Schema, Model } from "mongoose";

export interface IJudge {
  solution_1_score: number;
  solution_2_score: number;
  solution_1_reasoning: string;
  solution_2_reasoning: string;
}

export interface IBattleMessage {
  chatId: mongoose.Types.ObjectId;
  problem: string;
  solution_1: string;
  solution_2: string;
  judge: IJudge;
  winner: "solution_1" | "solution_2" | "tie";
  createdAt?: Date;
  updatedAt?: Date;
}

const judgeSubSchema = new Schema<IJudge>(
  {
    solution_1_score: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
      default: 0,
    },
    solution_2_score: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
      default: 0,
    },
    solution_1_reasoning: {
      type: String,
      required: true,
      default: "",
    },
    solution_2_reasoning: {
      type: String,
      required: true,
      default: "",
    },
  },
  { _id: false }
);

const battleMessageSchema = new Schema<IBattleMessage>(
  {
    chatId: {
      type: Schema.Types.ObjectId,
      ref: "ChatSession",
      required: [true, "chatId is required"],
    },
    problem: {
      type: String,
      required: [true, "problem/prompt is required"],
      trim: true,
    },
    solution_1: {
      type: String,
      required: [true, "solution_1 is required"],
    },
    solution_2: {
      type: String,
      required: [true, "solution_2 is required"],
    },
    judge: {
      type: judgeSubSchema,
      required: [true, "judge evaluation is required"],
    },
    winner: {
      type: String,
      required: [true, "winner is required"],
      enum: {
        values: ["solution_1", "solution_2", "tie"],
        message: "winner must be solution_1, solution_2, or tie",
      },
    },
  },
  { timestamps: true }
);

// Query optimization: chat ke messages chronological order me fetch karne ke liye
battleMessageSchema.index({ chatId: 1, createdAt: 1 });

const BattleMessageModel: Model<IBattleMessage> =
  mongoose.model<IBattleMessage>("BattleMessage", battleMessageSchema);

export default BattleMessageModel;