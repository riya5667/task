"use client";

import type { Id } from "../../convex/_generated/dataModel";
import { cn, formatSmartTimestamp } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { EmptyState } from "../ui/empty-state";
import { Skeleton } from "../ui/skeleton";

interface SidebarConversation {
  _id: Id<"conversations">;
  isGroup: boolean;
  title: string;
  avatarUrl?: string;
  memberCount: number;
  isOnline: boolean;
  unreadCount: number;
  lastMessagePreview: string;
  lastMessageAt: number;
}

interface ConversationListProps {
  conversations: SidebarConversation[];
  activeConversationId: Id<"conversations"> | null;
  onSelectConversation: (conversationId: Id<"conversations">) => void;
  isLoading?: boolean;
}

function ChatListIcon() {
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
      <path d="M8 10h8" />
      <path d="M8 14h5" />
      <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.3 0-2.5-.28-3.6-.79L3 21l1.87-4.12A8.5 8.5 0 1 1 21 11.5Z" />
    </svg>
  );
}

function GroupAvatarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="3" />
      <path d="M4 19c0-2.7 2.2-5 5-5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M14.5 19a4.5 4.5 0 0 1 7 0" />
    </svg>
  );
}

function formatUnreadCount(count: number) {
  return count > 99 ? "99+" : String(count);
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  isLoading = false,
}: ConversationListProps) {
  return (
    <div className="max-h-[45%] overflow-y-auto border-b border-border/70 p-2">
      <h2 className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Conversations
      </h2>
      <div className="space-y-1">
        {isLoading ? (
          <div className="space-y-2 px-1 py-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`conversation-skeleton-${index}`} className="flex items-center gap-3 px-2 py-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState
            title="No conversations"
            description="Start a new chat from People to see it here."
            icon={<ChatListIcon />}
            compact
          />
        ) : (
          conversations.map((conversation) => {
            const isActive = activeConversationId === conversation._id;

            return (
              <Button
                key={conversation._id}
                variant="ghost"
                onClick={() => onSelectConversation(conversation._id)}
                className={cn(
                  "h-auto w-full justify-start rounded-xl px-2 py-2 text-left transition-all duration-200",
                  isActive
                    ? "bg-accent shadow-sm ring-1 ring-border"
                    : "hover:-translate-y-[1px] hover:bg-accent/60",
                )}
              >
                <div className="flex w-full items-start gap-3">
                  <div className="relative mt-0.5">
                    {conversation.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={conversation.avatarUrl}
                        alt={conversation.title}
                        className="h-8 w-8 rounded-full border object-cover"
                      />
                    ) : conversation.isGroup ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-muted text-muted-foreground">
                        <GroupAvatarIcon />
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium">
                        {conversation.title.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    {!conversation.isGroup ? (
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-card",
                          conversation.isOnline ? "bg-emerald-500" : "bg-zinc-400",
                        )}
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{conversation.title}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatSmartTimestamp(conversation.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-muted-foreground">
                        {conversation.isGroup
                          ? `${conversation.memberCount} members • ${conversation.lastMessagePreview}`
                          : conversation.lastMessagePreview}
                      </p>
                      {conversation.unreadCount > 0 ? (
                        <Badge variant="success" className="min-w-5">
                          {formatUnreadCount(conversation.unreadCount)}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Button>
            );
          })
        )}
      </div>
    </div>
  );
}
