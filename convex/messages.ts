import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

type ConvexCtx = QueryCtx | MutationCtx;

const ALLOWED_REACTIONS = ["\u{1F44D}", "\u2764\uFE0F", "\u{1F602}", "\u{1F62E}", "\u{1F622}"] as const;

type AllowedReaction = (typeof ALLOWED_REACTIONS)[number];

const REACTION_STORAGE_KEY_BY_EMOJI: Record<AllowedReaction, string> = {
  "\u{1F44D}": "thumbs_up",
  "\u2764\uFE0F": "heart",
  "\u{1F602}": "joy",
  "\u{1F62E}": "surprised",
  "\u{1F622}": "sad",
};

const REACTION_EMOJI_BY_STORAGE_KEY = Object.fromEntries(
  Object.entries(REACTION_STORAGE_KEY_BY_EMOJI).map(([emoji, key]) => [key, emoji]),
) as Record<string, AllowedReaction>;

function isAllowedReaction(emoji: string): emoji is AllowedReaction {
  return ALLOWED_REACTIONS.includes(emoji as AllowedReaction);
}

function normalizeReactionStorageKey(rawKey: string) {
  if (REACTION_EMOJI_BY_STORAGE_KEY[rawKey]) {
    return rawKey;
  }
  if (isAllowedReaction(rawKey)) {
    return REACTION_STORAGE_KEY_BY_EMOJI[rawKey];
  }
  return null;
}

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

async function requireConversationMember(
  ctx: ConvexCtx,
  conversationId: Id<"conversations">,
  userId: Id<"users">,
) {
  const conversation = await ctx.db.get(conversationId);

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const isMember = conversation.members.some((id) => id === userId);
  if (!isMember) {
    throw new Error("Forbidden");
  }

  return conversation;
}

export const listByConversation = query({
  args: {
    conversationId: v.id("conversations"),
    currentClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx, args.currentClerkId);
    await requireConversationMember(ctx, args.conversationId, currentUser._id);

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_created_at", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    const senderIds = Array.from(new Set(messages.map((message) => message.senderId)));
    const senders = await Promise.all(senderIds.map((senderId) => ctx.db.get(senderId)));
    const safeSenders = senders.filter(
      (sender): sender is NonNullable<typeof sender> => sender !== null,
    );
    const senderMap = new Map(safeSenders.map((sender) => [sender._id, sender]));

    return messages.map((message) => {
      const storedReactions = message.reactions ?? {};
      const normalizedReactions: Record<string, Id<"users">[]> = {};
      const reactionEntries: Array<{ emoji: AllowedReaction; userIds: Id<"users">[] }> = [];

      for (const [rawKey, userIds] of Object.entries(storedReactions)) {
        const normalizedKey = normalizeReactionStorageKey(rawKey);
        if (!normalizedKey) {
          continue;
        }

        const deduped = Array.from(new Set(userIds));
        if (deduped.length === 0) {
          continue;
        }

        normalizedReactions[normalizedKey] = deduped;
        const emoji = REACTION_EMOJI_BY_STORAGE_KEY[normalizedKey];
        reactionEntries.push({ emoji, userIds: deduped });
      }

      const { reactions: _ignoredReactions, ...rest } = message;

      return {
        ...rest,
        reactions: normalizedReactions,
        reactionEntries,
        sender: senderMap.get(message.senderId) ?? null,
      };
    });
  },
});

export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    currentClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx, args.currentClerkId);
    const conversation = await requireConversationMember(ctx, args.conversationId, currentUser._id);

    const content = args.content.trim();
    if (!content) {
      throw new Error("Message content is required");
    }

    const now = Date.now();

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: currentUser._id,
      content,
      createdAt: now,
      deleted: false,
      reactions: {},
    });

    await ctx.db.patch(args.conversationId, {
      lastMessageId: messageId,
      updatedAt: now,
    });

    for (const memberId of conversation.members) {
      if (memberId === currentUser._id) {
        continue;
      }

      const rows = await ctx.db
        .query("unreadCounts")
        .withIndex("by_user_conversation", (q) =>
          q.eq("userId", memberId).eq("conversationId", args.conversationId),
        )
        .collect();

      const existing = rows[0] ?? null;
      const duplicates = rows.slice(1);

      for (const duplicate of duplicates) {
        await ctx.db.delete(duplicate._id);
      }

      if (existing) {
        await ctx.db.patch(existing._id, {
          count: existing.count + 1,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("unreadCounts", {
          userId: memberId,
          conversationId: args.conversationId,
          count: 1,
          updatedAt: now,
        });
      }
    }

    const typingRows = await ctx.db
      .query("typingStatus")
      .withIndex("by_conversation_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", currentUser._id),
      )
      .collect();

    for (const row of typingRows) {
      await ctx.db.delete(row._id);
    }

    return messageId;
  },
});

export const softDelete = mutation({
  args: {
    messageId: v.id("messages"),
    currentClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx, args.currentClerkId);
    const message = await ctx.db.get(args.messageId);

    if (!message) {
      throw new Error("Message not found");
    }

    await requireConversationMember(ctx, message.conversationId, currentUser._id);

    if (message.senderId !== currentUser._id) {
      throw new Error("Only sender can delete this message");
    }

    if (message.deleted) {
      return;
    }

    await ctx.db.patch(args.messageId, {
      deleted: true,
      content: "This message was deleted",
      reactions: {},
    });
  },
});

export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
    currentClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx, args.currentClerkId);
    const message = await ctx.db.get(args.messageId);

    if (!message) {
      throw new Error("Message not found");
    }

    await requireConversationMember(ctx, message.conversationId, currentUser._id);

    if (message.deleted) {
      throw new Error("Cannot react to deleted messages");
    }

    if (!isAllowedReaction(args.emoji)) {
      throw new Error("Unsupported reaction emoji");
    }

    const targetStorageKey = REACTION_STORAGE_KEY_BY_EMOJI[args.emoji];
    const currentReactions = message.reactions ?? {};
    const nextReactions: Record<string, Id<"users">[]> = {};

    for (const [rawKey, userIds] of Object.entries(currentReactions)) {
      const storageKey = normalizeReactionStorageKey(rawKey);
      if (!storageKey) {
        continue;
      }

      const deduped = Array.from(new Set(userIds));
      if (deduped.length > 0) {
        nextReactions[storageKey] = deduped;
      }
    }

    const existingForEmoji = nextReactions[targetStorageKey] ?? [];
    const alreadyReacted = existingForEmoji.some((userId) => userId === currentUser._id);

    if (alreadyReacted) {
      const filtered = existingForEmoji.filter((userId) => userId !== currentUser._id);

      if (filtered.length > 0) {
        nextReactions[targetStorageKey] = filtered;
      } else {
        delete nextReactions[targetStorageKey];
      }
    } else {
      nextReactions[targetStorageKey] = [...existingForEmoji, currentUser._id];
    }

    await ctx.db.patch(args.messageId, {
      reactions: nextReactions,
    });
  },
});
