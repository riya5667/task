"use client";

import type { Id } from "../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useRef } from "react";

import { api } from "../convex/_generated/api";

const PING_INTERVAL_MS = 1_200;
const INACTIVITY_TIMEOUT_MS = 2_000;

export function useTypingIndicator(conversationId: Id<"conversations">, currentClerkId?: string) {
  const setTypingMutation = useMutation(api.presence.setTyping);
  const lastPingRef = useRef(0);
  const stopTypingTimeoutRef = useRef<number | null>(null);

  const clearStopTimer = useCallback(() => {
    if (stopTypingTimeoutRef.current !== null) {
      window.clearTimeout(stopTypingTimeoutRef.current);
      stopTypingTimeoutRef.current = null;
    }
  }, []);

  const stopTyping = useCallback(() => {
    clearStopTimer();
    void setTypingMutation({ conversationId, isTyping: false, currentClerkId });
  }, [clearStopTimer, conversationId, currentClerkId, setTypingMutation]);

  const pingTyping = useCallback(() => {
    const now = Date.now();

    if (now - lastPingRef.current >= PING_INTERVAL_MS) {
      lastPingRef.current = now;
      void setTypingMutation({ conversationId, isTyping: true, currentClerkId });
    }

    clearStopTimer();
    stopTypingTimeoutRef.current = window.setTimeout(() => {
      void setTypingMutation({ conversationId, isTyping: false, currentClerkId });
      stopTypingTimeoutRef.current = null;
    }, INACTIVITY_TIMEOUT_MS);
  }, [clearStopTimer, conversationId, currentClerkId, setTypingMutation]);

  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [stopTyping]);

  return {
    pingTyping,
    stopTyping,
  };
}
