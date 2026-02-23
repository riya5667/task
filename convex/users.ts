import { v } from "convex/values";

import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";

type ConvexCtx = QueryCtx | MutationCtx;

async function getCurrentUserByClerkId(ctx: ConvexCtx, clerkId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .unique();
}

async function resolveCurrentUserOrNull(ctx: ConvexCtx, fallbackClerkId?: string) {
  const identity = await ctx.auth.getUserIdentity();
  const clerkId = identity?.subject ?? fallbackClerkId;
  if (!clerkId) {
    return null;
  }

  return await getCurrentUserByClerkId(ctx, clerkId);
}

async function requireCurrentUser(ctx: ConvexCtx, fallbackClerkId?: string) {
  const user = await resolveCurrentUserOrNull(ctx, fallbackClerkId);

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

export const syncFromClerk = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity && identity.subject !== args.clerkId) {
      throw new Error("Invalid user sync request");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        nameLower: args.name.toLowerCase(),
        email: args.email,
        imageUrl: args.imageUrl,
        isOnline: true,
        lastSeen: now,
        updatedAt: now,
      });

      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      name: args.name,
      nameLower: args.name.toLowerCase(),
      email: args.email,
      imageUrl: args.imageUrl,
      isOnline: true,
      lastSeen: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getCurrent = query({
  args: {
    currentClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await resolveCurrentUserOrNull(ctx, args.currentClerkId);
  },
});

export const searchForChat = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
    currentClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await resolveCurrentUserOrNull(ctx, args.currentClerkId);
    if (!currentUser) {
      return [];
    }

    const limit = Math.min(Math.max(args.limit ?? 20, 1), 50);
    const searchTerm = args.searchTerm.trim().toLowerCase();

    const rows =
      searchTerm.length === 0
        ? await ctx.db.query("users").withIndex("by_name_lower").take(limit + 1)
        : await ctx.db
            .query("users")
            .withIndex("by_name_lower", (q) =>
              q.gte("nameLower", searchTerm).lt("nameLower", `${searchTerm}\uffff`),
            )
            .take(limit + 1);

    return rows.filter((user) => user._id !== currentUser._id).slice(0, limit);
  },
});

export const setOnlineStatus = mutation({
  args: {
    isOnline: v.boolean(),
    currentClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx, args.currentClerkId);

    await ctx.db.patch(currentUser._id, {
      isOnline: args.isOnline,
      lastSeen: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
