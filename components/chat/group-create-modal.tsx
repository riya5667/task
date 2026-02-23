"use client";

import type { Id } from "../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useMemo, useState } from "react";

import { api } from "../../convex/_generated/api";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { EmptyState } from "../ui/empty-state";
import { ErrorState } from "../ui/error-state";
import { Input } from "../ui/input";

interface CandidateUser {
  _id: Id<"users">;
  name: string;
  email: string;
  imageUrl?: string;
  isOnline: boolean;
}

interface GroupCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: CandidateUser[];
  currentClerkId?: string;
  onConversationOpened: (conversationId: Id<"conversations">) => void;
}

export function GroupCreateModal({
  open,
  onOpenChange,
  users,
  currentClerkId,
  onConversationOpened,
}: GroupCreateModalProps) {
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<Id<"users">[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createGroupConversation = useMutation(api.conversations.createGroupConversation);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggleUser = (userId: Id<"users">) => {
    setErrorMessage(null);
    setSelected((previous) =>
      previous.includes(userId)
        ? previous.filter((id) => id !== userId)
        : [...previous, userId],
    );
  };

  const resetState = () => {
    setGroupName("");
    setSelected([]);
    setIsCreating(false);
    setErrorMessage(null);
  };

  const close = () => {
    onOpenChange(false);
    resetState();
  };

  const onCreate = async () => {
    setErrorMessage(null);

    const trimmedName = groupName.trim();

    if (!trimmedName) {
      setErrorMessage("Group name is required.");
      return;
    }

    if (selected.length < 2) {
      setErrorMessage("Select at least 2 members.");
      return;
    }

    setIsCreating(true);

    try {
      const conversationId = await createGroupConversation({
        name: trimmedName,
        memberIds: selected,
        currentClerkId,
      });

      onConversationOpened(conversationId);
      close();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create group.";
      setErrorMessage(message);
      setIsCreating(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg border-border/70 shadow-2xl shadow-black/10">
        <div className="border-b px-4 py-3">
          <h3 className="text-base font-semibold">Create Group</h3>
          <p className="text-xs text-muted-foreground">
            Name the group and select at least 2 members.
          </p>
        </div>

        <div className="space-y-3 p-4">
          <div>
            <label className="text-xs font-medium">Group name</label>
            <Input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="e.g. Product Team"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-medium">Members</label>
            <div className="mt-1 max-h-64 overflow-y-auto rounded-md border p-2">
              {users.length === 0 ? (
                <EmptyState
                  title="No group members selected"
                  description="Invite users to this workspace first."
                  compact
                />
              ) : (
                users.map((user) => (
                  <Button
                    key={user._id}
                    variant="ghost"
                    onClick={() => toggleUser(user._id)}
                    className={cn(
                      "h-auto w-full justify-start gap-2 rounded-lg px-2 py-2 text-left transition-all duration-200",
                      selectedSet.has(user._id)
                        ? "bg-accent ring-1 ring-border"
                        : "hover:-translate-y-[1px] hover:bg-accent/60",
                    )}
                  >
                    {user.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.imageUrl}
                        alt={user.name}
                        className="h-8 w-8 rounded-full border object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium">
                        {user.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        user.isOnline ? "bg-emerald-500" : "bg-zinc-400",
                      )}
                    />
                  </Button>
                ))
              )}
            </div>
          </div>

          {errorMessage ? (
            <ErrorState
              title="Could not create group"
              description={errorMessage}
              onRetry={onCreate}
            />
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <Button
            variant="outline"
            onClick={close}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void onCreate()}
            disabled={isCreating}
          >
            {isCreating ? "Creating..." : "Create Group"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
