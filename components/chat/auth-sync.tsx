"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";

import { api } from "../../convex/_generated/api";

const MAX_RETRY_DELAY_MS = 8_000;

export function AuthSync() {
  const { user, isLoaded, isSignedIn } = useUser();
  const syncFromClerk = useMutation(api.users.syncFromClerk);
  const lastSyncedSignature = useRef<string | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const retryDelayRef = useRef(500);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) {
      return;
    }

    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) {
      return;
    }

    const name = user.fullName ?? user.username ?? "Anonymous User";
    const signature = `${user.id}:${name}:${email}:${user.imageUrl ?? ""}`;

    if (lastSyncedSignature.current === signature) {
      return;
    }

    if (retryTimeoutRef.current !== null) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    lastSyncedSignature.current = signature;

    void (async () => {
      try {
        await syncFromClerk({
          clerkId: user.id,
          name,
          email,
          imageUrl: user.imageUrl,
        });
        retryDelayRef.current = 500;
      } catch {
        lastSyncedSignature.current = null;
        retryTimeoutRef.current = window.setTimeout(() => {
          retryTimeoutRef.current = null;
          retryDelayRef.current = Math.min(retryDelayRef.current * 2, MAX_RETRY_DELAY_MS);
          setRetryNonce((value) => value + 1);
        }, retryDelayRef.current);
      }
    })();
  }, [isLoaded, isSignedIn, user, syncFromClerk, retryNonce]);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current !== null) {
        window.clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return null;
}
