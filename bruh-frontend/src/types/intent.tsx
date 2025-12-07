import { Image, MessageCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const INTENTS = {
  CHAT: "chat",
  IMAGE: "image",
} as const;

export type Intent = (typeof INTENTS)[keyof typeof INTENTS];

export const getIntentValues = (): Intent[] => {
  return Object.values(INTENTS);
};

export const isValidIntent = (value: string): value is Intent => {
  return Object.values(INTENTS).includes(value as Intent);
};

export const getIntentIcon = (intent: Intent): LucideIcon => {
  switch (intent) {
    case INTENTS.IMAGE:
      return Image;
    case INTENTS.CHAT:
      return MessageCircle;
    default:
      return MessageCircle;
  }
};

export interface IntentMetadata {
  label: string;
  description: string;
}

export const INTENT_METADATA: Record<Intent, IntentMetadata> = {
  [INTENTS.CHAT]: {
    label: "Chat",
    description: "Have a conversation with AI",
  },
  [INTENTS.IMAGE]: {
    label: "Generate Image",
    description: "Create images from text descriptions",
  },
};

export const getIntentMetadata = (intent: Intent): IntentMetadata => {
  return INTENT_METADATA[intent];
};
