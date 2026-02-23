import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

type ConvexCtx = QueryCtx | MutationCtx;

const ACTIVE_WINDOW_MS = 35_000;

async function getCurrentUserOrNull(ctx: ConvexCtx, fallbackClerkId?: string) {
  const identity = await ctx.auth.getUserIdentity();
  const clerkId = identity?.subject ?? fallbackClerkId;
  if (!clerkId) {
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .unique();
  return user;
}

async function requireCurrentUser(ctx: ConvexCtx, fallbackClerkId?: string) {
  const user = await getCurrentUserOrNull(ctx, fallbackClerkId);
  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

async function recomputeUserOnline(ctx: MutationCtx, userId: Id<"users">, now: number) {
  const sessions = await ctx.db
    .query("presence")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  let hasActiveSession = false;

  for (const session of sessions) {
    const isActive = !session.disconnectedAt && session.lastActiveAt >= now - ACTIVE_WINDOW_MS;

    if (!isActive && !session.disconnectedAt && session.lastActiveAt < now - ACTIVE_WINDOW_MS) {
      await ctx.db.patch(session._id, { disconnectedAt: now });
    }

    if (isActive) {
      hasActiveSession = true;
    }
  }

  await ctx.db.patch(userId, {
    isOnline: hasActiveSession,
    lastSeen: now,
    updatedAt: now,
  });
}

export const upsertSession = mutation({
  args: {
    sessionId: v.string(),
    userAgent: v.optional(v.string()),
    currentClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserOrNull(ctx, args.currentClerkId);
    if (!currentUser) {
      return;
    }
    const now = Date.now();

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user_session", (q) =>
        q.eq("userId", currentUser._id).eq("sessionId", args.sessionId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastActiveAt: now,
        disconnectedAt: undefined,
        userAgent: args.userAgent,
      });
    } else {
      await ctx.db.insert("presence", {
        userId: currentUser._id,
        sessionId: args.sessionId,
        lastActiveAt: now,
        userAgent: args.userAgent,
      });
    }

    await recomputeUserOnline(ctx, currentUser._id, now);
  },
});

export const heartbeat = mutation({
  args: {
    sessionId: v.string(),
    currentClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserOrNull(ctx, args.currentClerkId);
    if (!currentUser) {
      return;
    }
    const now = Date.now();

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user_session", (q) =>
        q.eq("userId", currentUser._id).eq("sessionId", args.sessionId),
      )
      .first();

    if (!existing) {
      await ctx.db.insert("presence", {
        userId: currentUser._id,
        sessionId: args.sessionId,
        lastActiveAt: now,
      });
    } else {
      await ctx.db.patch(existing._id, {
        lastActiveAt: now,
        disconnectedAt: undefined,
      });
    }

    await recomputeUserOnline(ctx, currentUser._id, now);
  },
});

export const disconnectSession = mutation({
  args: {
    sessionId: v.string(),
    currentClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserOrNull(ctx, args.currentClerkId);
    if (!currentUser) {
      return;
    }
    const now = Date.now();

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user_session", (q) =>
        q.eq("userId", currentUser._id).eq("sessionId", args.sessionId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        disconnectedAt: now,
        lastActiveAt: now,
      });
    }

    await recomputeUserOnline(ctx, currentUser._id, now);
  },
});

export const setTyping = mutation({
  args: {
    conversationId: v.id("conversations"),
    isTyping: v.boolean(),
    currentClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserOrNull(ctx, args.currentClerkId);
    if (!currentUser) {
      return;
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const isMember = conversation.members.some((id) => id === currentUser._id);
    if (!isMember) {
      throw new Error("Forbidden");
    }

    const rows = await ctx.db
      .query("typingStatus")
      .withIndex("by_conversation_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", currentUser._id),
      )
      .collect();

    const existing = rows[0] ?? null;
    const duplicates = rows.slice(1);

    for (const row of duplicates) {
      await ctx.db.delete(row._id);
    }

    if (!args.isTyping) {
      if (existing) {
        await ctx.db.delete(existing._id);
      }
      return;
    }

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, { lastTypedAt: now });
    } else {
      await ctx.db.insert("typingStatus", {
        conversationId: args.conversationId,
        userId: currentUser._id,
        lastTypedAt: now,
      });
    }
  },
});

export const listTypingUsers = query({
  args: {
    conversationId: v.id("conversations"),
    currentClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUserOrNull(ctx, args.currentClerkId);
    if (!currentUser) {
      return [];
    }
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      return [];
    }

    const isMember = conversation.members.some((id) => id === currentUser._id);
    if (!isMember) {
      throw new Error("Forbidden");
    }

    const rows = await ctx.db
      .query("typingStatus")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    const activeRows = rows.filter((row) => row.userId !== currentUser._id);
    const users = await Promise.all(activeRows.map((row) => ctx.db.get(row.userId)));

    return users
      .map((user, index) => ({
        user,
        row: activeRows[index],
      }))
      .filter((entry): entry is { user: NonNullable<typeof entry.user>; row: (typeof activeRows)[number] } => entry.user !== null)
      .map((entry) => ({
        userId: entry.user._id,
        name: entry.user.name,
        lastTypedAt: entry.row.lastTypedAt,
      }));
  },
});
