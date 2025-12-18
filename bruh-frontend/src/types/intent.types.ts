import { Image, MessageCircle, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { OpenRouterModel } from "@/components/shared/model-selector/models";
import { modelSupportsImageGeneration } from "@/components/shared/model-selector/models";

export const INTENTS = {
  CHAT: "chat",
  IMAGE: "image",
  PERSONA: "persona",
} as const;

export type Intent = (typeof INTENTS)[keyof typeof INTENTS];

export type IntentCommand = {
  intent: Intent;
  label: string;
  description: string;
  requiresModel?: (model: OpenRouterModel | undefined) => boolean;
};

export const getIntentValues = (): Intent[] => {
  return Object.values(INTENTS);
};

export const isValidIntent = (value: string): value is Intent => {
  return Object.values(INTENTS).includes(value as Intent);
};

export const getIntentIcon = (intent: Intent): LucideIcon => {
  switch (intent) {
    case INTENTS.PERSONA:
      return Users;
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
  [INTENTS.PERSONA]: {
    label: "Persona",
    description: "Chat with one of your curated Personas",
  },
};

export const getIntentMetadata = (intent: Intent): IntentMetadata => {
  return INTENT_METADATA[intent];
};

export const getAvailableIntents = (
  selectedModel: OpenRouterModel | undefined,
): IntentCommand[] => {
  const commands: IntentCommand[] = [];

  Object.values(INTENTS).forEach((intent) => {
    if (intent === INTENTS.CHAT) return;

    const metadata = INTENT_METADATA[intent];

    if (intent === INTENTS.IMAGE) {
      if (!modelSupportsImageGeneration(selectedModel)) return;
    }

    commands.push({
      intent,
      label: `/${intent}`,
      description: metadata.description,
      requiresModel:
        intent === INTENTS.IMAGE
          ? (model) => modelSupportsImageGeneration(model)
          : undefined,
    });
  });

  return commands;
};
