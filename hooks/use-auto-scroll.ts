"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseAutoScrollOptions {
  itemCount: number;
  resetKey: string;
  bottomThresholdPx?: number;
}

export function useAutoScroll({
  itemCount,
  resetKey,
  bottomThresholdPx = 24,
}: UseAutoScrollOptions) {
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showNewMessagesButton, setShowNewMessagesButton] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const lastItemCountRef = useRef(0);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const hasNewItem = itemCount > lastItemCountRef.current;
    const shouldAutoScroll = hasNewItem && isNearBottom;

    if (shouldAutoScroll) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
      setShowNewMessagesButton(false);
    } else if (hasNewItem && !isNearBottom) {
      setShowNewMessagesButton(true);
    }

    lastItemCountRef.current = itemCount;
  }, [isNearBottom, itemCount]);

  useEffect(() => {
    setShowNewMessagesButton(false);
    setIsNearBottom(true);
    lastItemCountRef.current = 0;

    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }, [resetKey]);

  const onScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const nearBottom = distanceToBottom <= bottomThresholdPx;

    setIsNearBottom(nearBottom);
    if (nearBottom) {
      setShowNewMessagesButton(false);
    }
  }, [bottomThresholdPx]);

  const scrollToBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
    setIsNearBottom(true);
    setShowNewMessagesButton(false);
  }, []);

  return {
    isNearBottom,
    onScroll,
    scrollContainerRef,
    scrollToBottom,
    showNewMessagesButton,
  };
}
