"use client";

import type { Id } from "../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";

import { api } from "../../convex/_generated/api";
import { useDebouncedValue } from "../../hooks/use-debounced-value";
import { cn } from "../../lib/utils";
import { GroupCreateModal } from "../chat/group-create-modal";
import { Button } from "../ui/button";
import { EmptyState } from "../ui/empty-state";
import { ErrorState } from "../ui/error-state";
import { Input } from "../ui/input";
import { Skeleton } from "../ui/skeleton";

interface UserDiscoveryProps {
  currentClerkId?: string;
  onConversationOpened: (conversationId: Id<"conversations">) => void;
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4 text-muted-foreground"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function NoResultsIcon() {
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
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
      <path d="m9 9 4 4" />
      <path d="m13 9-4 4" />
    </svg>
  );
}

function PlusIcon() {
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
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function UserDiscovery({ currentClerkId, onConversationOpened }: UserDiscoveryProps) {
  const [search, setSearch] = useState("");
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search, 250);

  const users = useQuery(api.users.searchForChat, {
    searchTerm: debouncedSearch,
    limit: 30,
    currentClerkId,
  });
  const groupCandidates = useQuery(api.users.searchForChat, {
    searchTerm: "",
    limit: 50,
    currentClerkId,
  });

  const openOrCreateConversation = useMutation(
    api.conversations.getOrCreateDirectConversation,
  );

  const filteredUsers = useMemo(() => users ?? [], [users]);
  const hasSearchTerm = debouncedSearch.trim().length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-y p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold tracking-tight">People</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Search and start a direct conversation.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsGroupModalOpen(true)}
            className="gap-1"
          >
            <PlusIcon />
            Group
          </Button>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/70 bg-background/85 px-3 shadow-sm">
          <SearchIcon />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setOpenError(null);
            }}
            placeholder="Search users..."
            className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>

        {openError ? (
          <ErrorState
            title="Could not open conversation"
            description={openError}
            className="mt-3"
          />
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {users === undefined ? (
          <div className="space-y-2 p-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={`user-skeleton-${index}`} className="flex items-center gap-3 px-2 py-2">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          hasSearchTerm ? (
            <EmptyState
              title="No search results"
              description="Try another name or clear the search input."
              icon={<NoResultsIcon />}
              compact
            />
          ) : (
            <EmptyState
              title="No users available"
              description="New users will appear here automatically."
              icon={<SearchIcon />}
              compact
            />
          )
        ) : (
          filteredUsers.map((user) => (
            <Button
              key={user._id}
              variant="ghost"
              onClick={async () => {
                setOpenError(null);

                try {
                  const conversationId = await openOrCreateConversation({
                    targetUserId: user._id,
                    currentClerkId,
                  });
                  onConversationOpened(conversationId);
                } catch (error) {
                  const message =
                    error instanceof Error ? error.message : "Unable to open this conversation.";
                  setOpenError(message);
                }
              }}
              className={cn(
                "h-auto w-full justify-start gap-3 rounded-xl px-3 py-2 text-left transition-all duration-200",
                "hover:-translate-y-[1px] hover:bg-accent/70",
              )}
            >
              <div className="relative">
                {user.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.imageUrl}
                    alt={user.name}
                    className="h-9 w-9 rounded-full border object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border text-xs font-medium">
                    {user.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-card",
                    user.isOnline ? "bg-emerald-500" : "bg-zinc-400",
                  )}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </Button>
          ))
        )}
      </div>

      <GroupCreateModal
        open={isGroupModalOpen}
        onOpenChange={setIsGroupModalOpen}
        users={groupCandidates ?? []}
        currentClerkId={currentClerkId}
        onConversationOpened={onConversationOpened}
      />
    </div>
  );
}
