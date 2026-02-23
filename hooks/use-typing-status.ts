"use client";

import type { Id } from "../convex/_generated/dataModel";
import { useTypingIndicator } from "./use-typing-indicator";

export function useTypingStatus(conversationId: Id<"conversations">) {
  return useTypingIndicator(conversationId);
}
