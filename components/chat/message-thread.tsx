"use client";

import type { FormEvent, ReactNode } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { api } from "../../convex/_generated/api";
import { useAutoScroll } from "../../hooks/use-auto-scroll";
import { useTypingIndicator } from "../../hooks/use-typing-indicator";
import { cn, formatSmartTimestamp } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { EmptyState } from "../ui/empty-state";
import { ErrorState } from "../ui/error-state";
import { Input } from "../ui/input";
import { Skeleton } from "../ui/skeleton";
import { Textarea } from "../ui/textarea";

interface MessageThreadProps {
  conversationId: Id<"conversations">;
  currentUserId: Id<"users">;
  currentClerkId?: string;
}

const TYPING_VISIBLE_MS = 2_000;
const REACTION_EMOJIS = ["\u{1F44D}", "\u2764\uFE0F", "\u{1F602}", "\u{1F62E}", "\u{1F622}"] as const;
type ReactionEntry = {
  emoji: (typeof REACTION_EMOJIS)[number];
  userIds: Id<"users">[];
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMessageContent(content: string, query: string): ReactNode {
  if (!query.trim()) {
    return content;
  }

  const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
  const parts = content.split(regex);

  return parts.map((part, index) => {
    if (part.toLowerCase() === query.toLowerCase()) {
      return (
        <mark key={`${part}-${index}`} className="rounded bg-amber-200/80 px-0.5 text-foreground">
          {part}
        </mark>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function EmptyMessagesIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16h-8L5 20v-4H6.5A2.5 2.5 0 0 1 4 13.5Z" />
      <path d="M8 8h8" />
      <path d="M8 11h5" />
    </svg>
  );
}

function NewMessagesIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="m18 6-12 12" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function EmojiPickerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8 15s1.2 2 4 2 4-2 4-2" />
      <path d="M9 10h.01" />
      <path d="M15 10h.01" />
    </svg>
  );
}

export function MessageThread({
  conversationId,
  currentUserId,
  currentClerkId,
}: MessageThreadProps) {
  const [draft, setDraft] = useState("");
  const [clock, setClock] = useState(Date.now());
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastFailedContent, setLastFailedContent] = useState<string | null>(null);
  const [messageActionError, setMessageActionError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSearchResultIndex, setActiveSearchResultIndex] = useState(0);
  const [openReactionPickerMessageId, setOpenReactionPickerMessageId] = useState<Id<"messages"> | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const messages = useQuery(api.messages.listByConversation, { conversationId, currentClerkId });
  const typingUsers = useQuery(api.presence.listTypingUsers, { conversationId, currentClerkId });
  const sendMessage = useMutation(api.messages.send);
  const softDeleteMessage = useMutation(api.messages.softDelete);
  const toggleReaction = useMutation(api.messages.toggleReaction);
  const { pingTyping, stopTyping } = useTypingIndicator(conversationId, currentClerkId);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClock(Date.now());
    }, 500);

    return () => window.clearInterval(interval);
  }, []);

  const orderedMessages = useMemo(() => {
    return [...(messages ?? [])].sort((a, b) => a.createdAt - b.createdAt);
  }, [messages]);

  const searchResultMessageIndexes = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    if (!normalizedSearch) {
      return [] as number[];
    }

    return orderedMessages.reduce<number[]>((indexes, message, index) => {
      if (!message.deleted && message.content.toLowerCase().includes(normalizedSearch)) {
        indexes.push(index);
      }

      return indexes;
    }, []);
  }, [orderedMessages, searchQuery]);

  useEffect(() => {
    if (searchResultMessageIndexes.length === 0) {
      setActiveSearchResultIndex(0);
      return;
    }

    if (activeSearchResultIndex >= searchResultMessageIndexes.length) {
      setActiveSearchResultIndex(0);
    }
  }, [activeSearchResultIndex, searchResultMessageIndexes.length]);

  const activeResultMessageIndex =
    searchResultMessageIndexes.length > 0
      ? searchResultMessageIndexes[activeSearchResultIndex] ?? null
      : null;

  useEffect(() => {
    if (activeResultMessageIndex === null) {
      return;
    }

    const targetElement = document.getElementById(`message-row-${activeResultMessageIndex}`);
    targetElement?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeResultMessageIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isFindShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f";
      if (!isFindShortcut) {
        return;
      }

      event.preventDefault();
      setIsSearchOpen(true);
      window.setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 0);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const {
    onScroll,
    scrollContainerRef,
    scrollToBottom,
    showNewMessagesButton,
  } = useAutoScroll({
    itemCount: orderedMessages.length,
    resetKey: String(conversationId),
  });

  const typingText = useMemo(() => {
    if (!typingUsers || typingUsers.length === 0) {
      return "";
    }

    const activeUsers = typingUsers.filter((user) => clock - user.lastTypedAt < TYPING_VISIBLE_MS);

    if (activeUsers.length === 0) {
      return "";
    }

    if (activeUsers.length === 1) {
      return `${activeUsers[0].name} is typing...`;
    }

    if (activeUsers.length === 2) {
      return `${activeUsers[0].name} and ${activeUsers[1].name} are typing...`;
    }

    return "Several people are typing...";
  }, [clock, typingUsers]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const content = draft.trim();
    if (!content) {
      return;
    }

    setSendError(null);
    setLastFailedContent(null);
    setIsSending(true);

    try {
      await sendMessage({ conversationId, content, currentClerkId });
      setDraft("");
      stopTyping();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send message.";
      setSendError(message);
      setLastFailedContent(content);
    } finally {
      setIsSending(false);
    }
  };

  const retryLastSend = async () => {
    if (!lastFailedContent || isSending) {
      return;
    }

    setSendError(null);
    setIsSending(true);

    try {
      await sendMessage({ conversationId, content: lastFailedContent, currentClerkId });
      setLastFailedContent(null);
      stopTyping();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send message.";
      setSendError(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleMessageActionFailure = (error: unknown, fallbackMessage: string) => {
    const errorMessage = error instanceof Error ? error.message : fallbackMessage;
    setMessageActionError(errorMessage);
  };

  const jumpToNextSearchResult = () => {
    if (searchResultMessageIndexes.length === 0) {
      return;
    }

    setActiveSearchResultIndex((currentIndex) =>
      currentIndex + 1 >= searchResultMessageIndexes.length ? 0 : currentIndex + 1,
    );
  };

  const jumpToPreviousSearchResult = () => {
    if (searchResultMessageIndexes.length === 0) {
      return;
    }

    setActiveSearchResultIndex((currentIndex) =>
      currentIndex - 1 < 0 ? searchResultMessageIndexes.length - 1 : currentIndex - 1,
    );
  };

  if (messages === undefined) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`message-skeleton-${index}`}
            className={cn("flex", index % 2 === 0 ? "justify-start" : "justify-end")}
          >
            <div className="max-w-[78%] space-y-1 rounded-2xl border p-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {messageActionError ? (
        <div className="px-4 pt-3">
          <ErrorState
            title="Message update failed"
            description={messageActionError}
            onRetry={() => setMessageActionError(null)}
          />
        </div>
      ) : null}

      <div className="border-b border-border/70 px-4 py-2">
        <div className="flex items-center justify-end gap-2">
          {isSearchOpen ? (
            <>
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setActiveSearchResultIndex(0);
                }}
                placeholder="Search messages..."
                className="h-7 w-44 text-xs md:w-56"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={jumpToPreviousSearchResult}
                disabled={searchResultMessageIndexes.length === 0}
                className="h-7 px-2 text-xs"
              >
                Prev
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={jumpToNextSearchResult}
                disabled={searchResultMessageIndexes.length === 0}
                className="h-7 px-2 text-xs"
              >
                Next
              </Button>
              <span className="min-w-12 text-right text-xs text-muted-foreground">
                {searchQuery.trim()
                  ? `${searchResultMessageIndexes.length === 0 ? 0 : activeSearchResultIndex + 1}/${searchResultMessageIndexes.length}`
                  : "\u00A0"}
              </span>
            </>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={isSearchOpen ? "Close search" : "Open search"}
            onClick={() => {
              const nextOpenState = !isSearchOpen;
              setIsSearchOpen(nextOpenState);
              if (nextOpenState) {
                window.setTimeout(() => {
                  searchInputRef.current?.focus();
                }, 0);
              }
            }}
            className="h-7 w-7"
          >
            {isSearchOpen ? <CloseIcon /> : <SearchIcon />}
          </Button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={onScroll}
        className="relative min-h-0 flex-1 overflow-y-auto p-4"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[url('/images/bg.webp')] bg-[length:600px_auto] bg-repeat opacity-75 blur-[0.6px]"
        />
        <div className="relative z-10 space-y-3 rounded-2xl bg-background/52 p-2">
          {orderedMessages.length === 0 ? (
            <EmptyState
              title="No messages"
              description="Send the first message to start this conversation."
              icon={<EmptyMessagesIcon />}
            />
          ) : (
            orderedMessages.map((message, messageIndex) => {
              const isOwn = message.senderId === currentUserId;
              const canDelete = isOwn && !message.deleted;
              const reactionEntries = (message as { reactionEntries?: ReactionEntry[] }).reactionEntries ?? [];
              const reactionMap = new Map(
                reactionEntries.map((entry) => [entry.emoji, entry.userIds] as const),
              );

              const reactionSummary = REACTION_EMOJIS.map((emoji) => {
                const userIds = reactionMap.get(emoji) ?? [];

                return {
                  emoji,
                  count: userIds.length,
                  reactedByCurrentUser: userIds.some((userId) => userId === currentUserId),
                };
              }).filter((entry) => entry.count > 0);

              const isActiveSearchResult = messageIndex === activeResultMessageIndex;

              return (
                <div
                  key={message._id}
                  id={`message-row-${messageIndex}`}
                  className={cn("flex", isOwn ? "justify-end" : "justify-start")}
                >
                <div className="max-w-[78%]">
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-2 shadow-sm transition-all duration-200",
                      isOwn
                        ? "rounded-br-md bg-foreground text-background hover:shadow-md"
                        : "rounded-bl-md border border-border bg-background text-foreground hover:shadow-md",
                      isActiveSearchResult && "ring-2 ring-amber-400 ring-offset-1",
                    )}
                  >
                    {!isOwn ? (
                      <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                        {message.sender?.name ?? "Unknown"}
                      </p>
                    ) : null}

                    <p
                      className={cn(
                        "whitespace-pre-wrap break-words text-sm",
                        message.deleted ? "italic" : "not-italic",
                      )}
                    >
                      {message.deleted
                        ? "This message was deleted"
                        : highlightMessageContent(message.content, searchQuery)}
                    </p>

                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "text-[10px]",
                          isOwn ? "text-background/70" : "text-muted-foreground",
                        )}
                      >
                        {formatSmartTimestamp(message.createdAt)}
                      </p>

                      {canDelete ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setMessageActionError(null);
                            void softDeleteMessage({
                              messageId: message._id,
                              currentClerkId,
                            }).catch((error) =>
                              handleMessageActionFailure(error, "Unable to delete this message."),
                            );
                          }}
                          className={cn("h-auto px-1 py-0 text-[10px] underline", isOwn ? "text-background/80 hover:text-background" : "text-muted-foreground")}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {!message.deleted ? (
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {reactionSummary.map((entry) => (
                        <Button
                          key={`${message._id}-${entry.emoji}`}
                          variant={entry.reactedByCurrentUser ? "secondary" : "outline"}
                          size="sm"
                          onClick={() =>
                            void toggleReaction({
                              messageId: message._id,
                              emoji: entry.emoji,
                              currentClerkId,
                            }).catch((error) =>
                              handleMessageActionFailure(error, "Unable to update reaction."),
                            )
                          }
                          className="h-6 rounded-full px-2 py-0 text-xs"
                        >
                          <span>{entry.emoji}</span>
                          <Badge
                            variant={entry.reactedByCurrentUser ? "success" : "secondary"}
                            className="px-1 py-0 text-[10px]"
                          >
                            {entry.count}
                          </Badge>
                        </Button>
                      ))}

                      <div className="relative">
                        <Button
                          key={`${message._id}-toggle-picker`}
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            setOpenReactionPickerMessageId((currentId) =>
                              currentId === message._id ? null : message._id,
                            )
                          }
                          className="h-6 w-6 rounded-full"
                          aria-label="Open emoji picker"
                        >
                          <EmojiPickerIcon />
                        </Button>

                        {openReactionPickerMessageId === message._id ? (
                          <div
                            className={cn(
                              "absolute z-20 mt-1 flex items-center gap-1 rounded-full border border-border bg-card px-1.5 py-1 shadow-lg",
                              isOwn ? "right-0" : "left-0",
                            )}
                          >
                            {REACTION_EMOJIS.map((emoji) => (
                              <Button
                                key={`${message._id}-choose-${emoji}`}
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  void toggleReaction({
                                    messageId: message._id,
                                    emoji,
                                    currentClerkId,
                                  })
                                    .then(() => setOpenReactionPickerMessageId(null))
                                    .catch((error) =>
                                      handleMessageActionFailure(error, "Unable to update reaction."),
                                    )
                                }
                                className="h-7 w-7 rounded-full text-sm hover:scale-110"
                                aria-label={`React with ${emoji}`}
                              >
                                {emoji}
                              </Button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex h-8 items-center justify-between px-4 text-xs text-muted-foreground">
        <span>{typingText}</span>
        {showNewMessagesButton ? (
          <Button
            variant="outline"
            size="sm"
            onClick={scrollToBottom}
            className="h-7 rounded-full px-2 text-[11px] shadow-sm"
          >
            <NewMessagesIcon />
            {"\u2193"} New Messages
          </Button>
        ) : null}
      </div>

      {sendError ? (
        <div className="px-4 pb-2">
          <ErrorState
            title="Message not sent"
            description={sendError}
            onRetry={() => void retryLastSend()}
          />
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="border-t p-3">
        <div className="flex items-end gap-2 rounded-xl border border-border/80 bg-background/90 p-2 shadow-sm">
          <Textarea
            value={draft}
            onChange={(event) => {
              const value = event.target.value;
              setDraft(value);

              if (value.trim()) {
                pingTyping();
              } else {
                stopTyping();
              }
            }}
            placeholder="Write a message..."
            rows={1}
            className="max-h-28 min-h-[36px] flex-1 resize-none border-0 bg-transparent px-1 py-1 shadow-none focus-visible:ring-0"
          />
          <Button
            type="submit"
            disabled={!draft.trim() || isSending}
            className="h-9 px-3"
          >
            {isSending ? "Sending..." : "Send"}
          </Button>
        </div>
      </form>
    </div>
  );
}
