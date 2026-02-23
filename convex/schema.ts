import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    nameLower: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    lastSeen: v.number(),
    isOnline: v.boolean(),
    // Extensible profile surface
    bio: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_name_lower", ["nameLower"])
    .index("by_online", ["isOnline"])
    .index("by_last_seen", ["lastSeen"]),

  conversations: defineTable({
    isGroup: v.boolean(),
    name: v.optional(v.string()),
    members: v.array(v.id("users")),
    lastMessageId: v.optional(v.id("messages")),
    // Deterministic key for 1:1 conversation dedupe
    directKey: v.optional(v.string()),
    // Extensible conversation metadata
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    archivedAt: v.optional(v.number()),
  })
    .index("by_members", ["members"])
    .index("by_direct_key", ["directKey"])
    .index("by_updated_at", ["updatedAt"])
    .index("by_created_at", ["createdAt"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    createdAt: v.number(),
    deleted: v.boolean(),
    reactions: v.record(v.string(), v.array(v.id("users"))),
    // Extensible message metadata
    editedAt: v.optional(v.number()),
    replyToMessageId: v.optional(v.id("messages")),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_sender", ["senderId"])
    .index("by_created_at", ["createdAt"])
    .index("by_conversation_created_at", ["conversationId", "createdAt"]),

  unreadCounts: defineTable({
    userId: v.id("users"),
    conversationId: v.id("conversations"),
    count: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_conversation", ["conversationId"])
    .index("by_user_conversation", ["userId", "conversationId"]),

  // Per-tab presence sessions for robust online status across multiple tabs.
  presence: defineTable({
    userId: v.id("users"),
    sessionId: v.string(),
    lastActiveAt: v.number(),
    disconnectedAt: v.optional(v.number()),
    userAgent: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_user_session", ["userId", "sessionId"]),

  typingStatus: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    lastTypedAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"])
    .index("by_conversation_user", ["conversationId", "userId"]),
});
