import { INTENTS, type Intent } from "@/types/intent.types";
import { AspectRatioSelector } from "./aspect-ratio-selector";
import { PersonaSelector } from "./persaona-selector";
import type { AspectRatio } from "@/types/image.types";
import { modelSupportsAspectRatio } from "@/components/shared/model-selector/models";

type IntentParametersProps = {
  modelId: string | undefined;
  intent: Intent;
  aspectRatio?: AspectRatio;
  onAspectRatioChange?: (aspectRatio: AspectRatio) => void;
  personaId?: string;
  onPersonaChange?: (personaId: string | undefined) => void;
};

export const IntentParameters = ({
  modelId,
  intent,
  aspectRatio,
  onAspectRatioChange,
  personaId,
  onPersonaChange,
}: IntentParametersProps) => {
  if (intent === INTENTS.IMAGE && aspectRatio && onAspectRatioChange) {
    if (!modelSupportsAspectRatio(modelId)) {
      return null;
    }
    return (
      <AspectRatioSelector
        selectedRatio={aspectRatio}
        onRatioChange={onAspectRatioChange}
      />
    );
  }

  if (intent === INTENTS.PERSONA && onPersonaChange) {
    return (
      <PersonaSelector
        selectedPersonaId={personaId}
        onPersonaChange={onPersonaChange}
      />
    );
  }

  return null;
};
