"use client";

import { usePresence } from "./use-presence";

export function usePresenceTracking(isEnabled: boolean) {
  usePresence(isEnabled);
}
