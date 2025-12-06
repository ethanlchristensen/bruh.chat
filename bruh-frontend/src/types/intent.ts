export const INTENTS = {
  CHAT: 'chat',
  IMAGE: 'image',
} as const;

export type Intent = typeof INTENTS[keyof typeof INTENTS];

export const getIntentValues = (): Intent[] => {
  return Object.values(INTENTS);
};

export const isValidIntent = (value: string): value is Intent => {
  return Object.values(INTENTS).includes(value as Intent);
};

export interface IntentMetadata {
  label: string;
  description: string;
  icon?: string;
}

export const INTENT_METADATA: Record<Intent, IntentMetadata> = {
  [INTENTS.CHAT]: {
    label: 'Chat',
    description: 'Have a conversation with AI',
    icon: '💬',
  },
  [INTENTS.IMAGE]: {
    label: 'Generate Image',
    description: 'Create images from text descriptions',
    icon: '🖼️',
  }
};

export const getIntentMetadata = (intent: Intent): IntentMetadata => {
  return INTENT_METADATA[intent];
};