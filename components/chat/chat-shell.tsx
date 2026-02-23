"use client";

import { UserButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import type { Id } from "../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";

import { api } from "../../convex/_generated/api";
import { usePresence } from "../../hooks/use-presence";
import { useUnreadCounts } from "../../hooks/use-unread-counts";
import { cn } from "../../lib/utils";
import { MessageThread } from "./message-thread";
import { ConversationList } from "../sidebar/conversation-list";
import { UserDiscovery } from "../sidebar/user-discovery";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { ErrorState } from "../ui/error-state";

function BackIcon() {
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
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function ChatShell() {
  const [activeConversationId, setActiveConversationId] = useState<Id<"conversations"> | null>(
    null,
  );
  const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(false);

  const { isLoaded, isSignedIn, user } = useUser();

  const shouldLoadChatData = isLoaded && isSignedIn;
  const currentUser = useQuery(
    api.users.getCurrent,
    shouldLoadChatData ? { currentClerkId: user?.id } : "skip",
  );
  const conversations = useQuery(
    api.conversations.listForSidebar,
    shouldLoadChatData ? { currentClerkId: user?.id } : "skip",
  );

  usePresence(Boolean(isSignedIn), user?.id);

  useEffect(() => {
    if (!activeConversationId && conversations && conversations.length > 0) {
      setActiveConversationId(conversations[0]._id);
    }
  }, [activeConversationId, conversations]);

  const { clearReadError, readError, retryMarkRead } = useUnreadCounts(
    activeConversationId,
    conversations,
    user?.id,
  );

  const activeConversation = useMemo(() => {
    if (!activeConversationId || !conversations) {
      return null;
    }

    return conversations.find((conversation) => conversation._id === activeConversationId) ?? null;
  }, [activeConversationId, conversations]);

  const handleSelectConversation = (conversationId: Id<"conversations">) => {
    clearReadError();
    setActiveConversationId(conversationId);
    setIsMobileThreadOpen(true);
  };

  return (
    <main className="min-h-screen w-full bg-[radial-gradient(circle_at_top_left,hsl(var(--accent))_0%,transparent_45%),radial-gradient(circle_at_top_right,hsl(var(--secondary))_0%,transparent_35%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)] p-0 md:p-6">
      <Card className="mx-auto flex h-screen w-full overflow-hidden rounded-none border-0 bg-card/90 shadow-2xl shadow-black/10 backdrop-blur md:h-[calc(100vh-3rem)] md:rounded-2xl md:border">
        <aside
          className={cn(
            "h-full w-full border-r border-border/70 bg-card/95 backdrop-blur md:flex md:w-[360px] md:flex-none",
            isMobileThreadOpen ? "hidden md:flex" : "flex",
          )}
        >
          <div className="flex h-full w-full flex-col">
            <header className="flex items-center justify-between border-b border-border/70 px-4 py-3 md:px-5">
              <div>
                <h1 className="text-base font-semibold tracking-tight">Chats</h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {currentUser ? currentUser.name : "Loading profile..."}
                </p>
              </div>
              <UserButton afterSignOutUrl="/" />
            </header>

            <ConversationList
              conversations={conversations ?? []}
              activeConversationId={activeConversationId}
              onSelectConversation={handleSelectConversation}
              isLoading={conversations === undefined}
            />
            <UserDiscovery
              currentClerkId={user?.id}
              onConversationOpened={handleSelectConversation}
            />
          </div>
        </aside>

        <section
          className={cn(
            "min-h-0 min-w-0 flex-1 flex-col",
            isMobileThreadOpen ? "flex" : "hidden md:flex",
          )}
        >
          <header className="flex items-center justify-between border-b border-border/70 bg-card/95 px-4 py-3 backdrop-blur md:px-6 md:py-4">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsMobileThreadOpen(false)}
                className="h-8 w-8 md:hidden"
                aria-label="Back to conversations"
              >
                <BackIcon />
              </Button>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold md:text-base">
                  {activeConversation?.title ?? "Conversation"}
                </h2>
                <p className="truncate text-xs text-muted-foreground">
                  {activeConversation ? (
                    activeConversation.isGroup ? (
                      `${activeConversation.memberCount} members`
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            activeConversation.isOnline ? "bg-emerald-500" : "bg-zinc-400",
                          )}
                        />
                        {activeConversation.isOnline ? "Online" : "Offline"}
                      </span>
                    )
                  ) : (
                    "Select a conversation"
                  )}
                </p>
              </div>
            </div>

            <div className="hidden text-xs text-muted-foreground md:block">
              Real-time chat
            </div>
          </header>

          {readError ? (
            <div className="p-3">
              <ErrorState
                title="Sync issue"
                description={readError}
                onRetry={retryMarkRead}
              />
            </div>
          ) : null}

          <div className="min-h-0 flex-1">
            {activeConversationId && currentUser ? (
              <MessageThread
                conversationId={activeConversationId}
                currentUserId={currentUser._id}
                currentClerkId={user?.id}
              />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
                Select a conversation or start one from People.
              </div>
            )}
          </div>
        </section>
      </Card>
    </main>
  );
}
