import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

type ConvexCtx = QueryCtx | MutationCtx;

async function getCurrentUserOrNull(ctx: ConvexCtx, fallbackClerkId?: string) {
  const identity = await ctx.auth.getUserIdentity();
  const clerkId = identity?.subject ?? fallbackClerkId;
  if (!clerkId) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .unique();
}

async function requireCurrentUser(ctx: ConvexCtx, fallbackClerkId?: string) {
  const user = await getCurrentUserOrNull(ctx, fallbackClerkId);

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

function makeDirectKey(userA: string, userB: string) {
  return [userA, userB].sort().join(":");
}

function dedupeIds(ids: Id<"users">[]) {
  return Array.from(new Set(ids));
}

export const getOrCreateDirectConversation = mutation({
  args: {
    targetUserId: v.id("users"),
    currentClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx, args.currentClerkId);

    if (currentUser._id === args.targetUserId) {
      throw new Error("Cannot create a conversation with yourself");
    }

    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) {
      throw new Error("Target user not found");
    }

    const directKey = makeDirectKey(currentUser._id, args.targetUserId);

    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_direct_key", (q) => q.eq("directKey", directKey))
      .unique();

    if (existing && !existing.isGroup) {
      await ctx.db.patch(existing._id, { updatedAt: Date.now() });
      return existing._id;
    }

    const now = Date.now();

    return await ctx.db.insert("conversations", {
      isGroup: false,
      members: [currentUser._id, args.targetUserId],
      directKey,
      createdBy: currentUser._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createGroupConversation = mutation({
  args: {
    name: v.string(),
    memberIds: v.array(v.id("users")),
    currentClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx, args.currentClerkId);

    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new Error("Group name is required");
    }

    const selectedIds = dedupeIds(args.memberIds).filter((id) => id !== currentUser._id);

    if (selectedIds.length < 2) {
      throw new Error("Select at least 2 members");
    }

    for (const memberId of selectedIds) {
      const member = await ctx.db.get(memberId);
      if (!member) {
        throw new Error("One or more selected users no longer exist");
      }
    }

    const now = Date.now();

    return await ctx.db.insert("conversations", {
      isGroup: true,
      name: trimmedName,
      members: [currentUser._id, ...selectedIds],
      createdBy: currentUser._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const markConversationRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    currentClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx, args.currentClerkId);
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      return;
    }

    const isMember = conversation.members.some((id) => id === currentUser._id);
    if (!isMember) {
      throw new Error("Forbidden");
    }

    const rows = await ctx.db
      .query("unreadCounts")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", currentUser._id).eq("conversationId", args.conversationId),
      )
      .collect();

    if (rows.length === 0) {
      return;
    }

    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
  },
});

export const listForSidebar = query({
  args: {
    currentClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserOrNull(ctx, args.currentClerkId);
    if (!currentUser) {
      return [];
    }

    const allConversations = await ctx.db.query("conversations").withIndex("by_updated_at").collect();
    const unreadRows = await ctx.db
      .query("unreadCounts")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .collect();

    const unreadMap = new Map<string, number>();

    for (const row of unreadRows) {
      const key = String(row.conversationId);
      const previous = unreadMap.get(key) ?? 0;
      unreadMap.set(key, previous + row.count);
    }

    const memberConversations = allConversations
      .filter((conversation) => conversation.members.some((id) => id === currentUser._id))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 50);

    const items = await Promise.all(
      memberConversations.map(async (conversation) => {
        const lastMessage = conversation.lastMessageId
          ? await ctx.db.get(conversation.lastMessageId)
          : null;

        const otherMemberId = conversation.members.find((memberId) => memberId !== currentUser._id);
        const otherMember = !conversation.isGroup && otherMemberId ? await ctx.db.get(otherMemberId) : null;

        return {
          _id: conversation._id,
          isGroup: conversation.isGroup,
          title: conversation.isGroup ? conversation.name ?? "Group Chat" : otherMember?.name ?? "Unknown User",
          avatarUrl: conversation.isGroup ? undefined : otherMember?.imageUrl,
          memberCount: conversation.members.length,
          isOnline: conversation.isGroup ? false : Boolean(otherMember?.isOnline),
          unreadCount: unreadMap.get(String(conversation._id)) ?? 0,
          lastMessagePreview: lastMessage ? (lastMessage.deleted ? "Message deleted" : lastMessage.content) : "No messages yet",
          lastMessageAt: lastMessage?.createdAt ?? conversation.updatedAt,
          updatedAt: conversation.updatedAt,
        };
      }),
    );

    return items;
  },
});

export const getById = query({
  args: {
    conversationId: v.id("conversations"),
    currentClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserOrNull(ctx, args.currentClerkId);
    if (!currentUser) {
      return null;
    }
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      return null;
    }

    const isMember = conversation.members.some((id) => id === currentUser._id);
    if (!isMember) {
      return null;
    }

    return conversation;
  },
});
