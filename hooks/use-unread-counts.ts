"use client";

import type { Id } from "../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "../convex/_generated/api";

interface SidebarConversation {
  _id: Id<"conversations">;
  unreadCount: number;
}

export function useUnreadCounts(
  activeConversationId: Id<"conversations"> | null,
  conversations: SidebarConversation[] | undefined,
  currentClerkId?: string,
) {
  const markConversationRead = useMutation(api.conversations.markConversationRead);
  const [readError, setReadError] = useState<string | null>(null);
  const lastReadRequestRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeConversationId || !conversations) {
      return;
    }

    const activeConversation = conversations.find(
      (conversation) => conversation._id === activeConversationId,
    );

    if (!activeConversation || activeConversation.unreadCount <= 0) {
      return;
    }

    const requestKey = `${String(activeConversationId)}:${activeConversation.unreadCount}`;
    if (lastReadRequestRef.current === requestKey) {
      return;
    }

    lastReadRequestRef.current = requestKey;

    void markConversationRead({ conversationId: activeConversationId, currentClerkId }).catch((error) => {
      const message = error instanceof Error ? error.message : "Failed to mark as read.";
      setReadError(message);
    });
  }, [activeConversationId, conversations, currentClerkId, markConversationRead]);

  const retryMarkRead = useCallback(() => {
    if (!activeConversationId) {
      return;
    }

    setReadError(null);

    void markConversationRead({ conversationId: activeConversationId, currentClerkId }).catch((error) => {
      const message = error instanceof Error ? error.message : "Failed to mark as read.";
      setReadError(message);
    });
  }, [activeConversationId, currentClerkId, markConversationRead]);

  const clearReadError = useCallback(() => {
    setReadError(null);
  }, []);

  return {
    clearReadError,
    readError,
    retryMarkRead,
  };
}
