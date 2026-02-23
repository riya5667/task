"use client";

import { useMutation } from "convex/react";
import { useEffect, useMemo, useRef } from "react";

import { api } from "../convex/_generated/api";

const SESSION_STORAGE_KEY = "chat_presence_session_id";
const HEARTBEAT_INTERVAL_MS = 20_000;

function createSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function usePresence(isEnabled: boolean, currentClerkId?: string) {
  const upsertSession = useMutation(api.presence.upsertSession);
  const heartbeat = useMutation(api.presence.heartbeat);
  const disconnectSession = useMutation(api.presence.disconnectSession);
  const sessionIdRef = useRef<string | null>(null);

  const sessionId = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      return stored;
    }

    const created = createSessionId();
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, created);
    return created;
  }, []);

  useEffect(() => {
    if (!isEnabled || !sessionId) {
      return;
    }

    sessionIdRef.current = sessionId;

    void upsertSession({
      sessionId,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      currentClerkId,
    });

    const interval = window.setInterval(() => {
      void heartbeat({ sessionId, currentClerkId });
    }, HEARTBEAT_INTERVAL_MS);

    const handleExit = () => {
      if (sessionIdRef.current) {
        void disconnectSession({ sessionId: sessionIdRef.current, currentClerkId });
      }
    };

    window.addEventListener("beforeunload", handleExit);
    window.addEventListener("pagehide", handleExit);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("beforeunload", handleExit);
      window.removeEventListener("pagehide", handleExit);
      handleExit();
    };
  }, [currentClerkId, disconnectSession, heartbeat, isEnabled, sessionId, upsertSession]);
}
