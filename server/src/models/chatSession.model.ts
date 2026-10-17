/** Left side bar mein chat history ke liye - both agent & battle mode */
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChatSession extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  mode: "agent" | "battle";
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const chatSessionSchema = new Schema<IChatSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId is required"],

    },
    title: {
      type: String,
      required: [true, "title is required"],
      trim: true,
      maxlength: [60, "title must be at most 60 characters long"],
    },
    mode: {
      type: String,
      required: [true, "mode is required"],
      enum: {
        values: ["agent", "battle"],
        message: "mode must be either agent or battle",
      },
      default: "battle",
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Sidebar listing query index: Pinned chats top par + recently updated chats pehle
chatSessionSchema.index({ userId: 1, isPinned: -1, updatedAt: -1 });

const ChatSessionModel: Model<IChatSession> = mongoose.model<IChatSession>(
  "ChatSession",
  chatSessionSchema
);

export default ChatSessionModel;
