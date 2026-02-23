export type ConversationType = "direct" | "group";
export type MemberRole = "member" | "admin";

export interface ChatUser {
  id: string;
  clerkId: string;
  name: string;
  imageUrl?: string;
  email?: string;
  statusText?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  title?: string;
  avatarUrl?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface ConversationMember {
  id: string;
  conversationId: string;
  userId: string;
  role: MemberRole;
  lastReadAt?: number;
  joinedAt: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  deletedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: number;
}

export interface PresenceState {
  id: string;
  userId: string;
  isOnline: boolean;
  lastSeenAt: number;
  activeConversationId?: string;
  typingInConversationId?: string;
}
