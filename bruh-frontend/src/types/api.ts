import type { AspectRatio } from "./image";
import type { Intent } from "./intent";

export type BaseEntity = {
  id: string;
  created_at: number;
};

export type Entity<T> = {
  [K in keyof T]: T[K];
} & BaseEntity;

export type Meta = {
  page: number;
  total: number;
  totalPages: number;
};

export interface UserProfile {
  bio: string;
  profile_image: string;
  default_model: string;
  default_provider: string;
  default_aux_model: string;
  auto_generate_titles: boolean;
  title_generation_frequency: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
  profile: UserProfile;
}

export interface AuthTokens {
  access: string;
  refresh: string;
  expires_at: number;
}

export type AuthResponse = {
  username: string;
  refresh: string;
  access: string;
};

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  model?: string;
  provider?: string;
  intent?: Intent;
  aspect_ratio?: AspectRatio;
  files?: File[];
}

export type ImageGenerationChatRequest = {
  conversation_id?: string;
  prompt: string;
  model?: string;
  aspect_ratio?: string;
};

export type ChatUsageResponse = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost?: number;
};

export type ChatSuccessResponse = {
  success: boolean;
  conversation_id: string;
  message: string;
  user_message_id: string;
  assistant_message_id: string;
  usage: ChatUsageResponse;
};

export type ChatErrorResponse = {
  success: boolean;
  error: string;
  conversation_id?: string;
};

export type Conversation = Entity<{
  title: string;
  updated_at: string;
}>;

export type ConversationsResponse = {
  conversations: Conversation[];
};

export type Message = Entity<{
  conversation_id: string;
  role: string;
  content: string;
  model_id?: string;
  isStreaming?: boolean;
  chunks?: string[];
  attachments?: MessageAttachment[];
  generated_images?: GeneratedImage[];
  reasoning?: Reasoning;
}>;

export type MessageAttachment = {
  id?: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  created_at?: string;
};

export type GeneratedImage = {
  id: string;
  image_url: string;
  prompt: string;
  model_used: string;
  aspect_ratio?: AspectRatio;
  width?: number;
  height?: number;
  created_at: string;
};

export type GeneratedReasoningImage = {
  id: string;
  image_url: string;
  model_used: string;
  created_at: string;
};

export type ConversationDetailResponse = {
  conversation: Conversation;
  messages: Message[];
};

export type ConversationCreateRequest = {
  title?: string;
};

export type Reasoning = {
  id: string;
  content: string;
  created_at: string;
  generated_reasoning_images: GeneratedReasoningImage[];
};
