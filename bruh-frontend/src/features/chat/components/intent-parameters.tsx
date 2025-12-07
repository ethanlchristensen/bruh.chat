import { AspectRatioSelector } from "./aspect-ratio-selector";
import { INTENTS, type Intent } from "@/types/intent";
import type { AspectRatio } from "@/types/image";
import { modelSupportsAspectRatio } from "@/components/shared/model-selector/models";

type IntentParametersProps = {
  modelId?: string;
  intent: Intent;
  aspectRatio?: AspectRatio;
  onAspectRatioChange?: (ratio: AspectRatio) => void;
};

export const IntentParameters = ({
  modelId,
  intent,
  aspectRatio,
  onAspectRatioChange,
}: IntentParametersProps) => {
  if (intent === INTENTS.IMAGE) {
    if (!modelSupportsAspectRatio(modelId)) {
      return null;
    }

    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
        <AspectRatioSelector
          selectedRatio={aspectRatio}
          onRatioChange={onAspectRatioChange}
        />
      </div>
    );
  }
  return null;
};
