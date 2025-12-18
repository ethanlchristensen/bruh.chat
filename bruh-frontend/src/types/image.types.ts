export type AspectRatio =
  | "1:1"
  | "2:3"
  | "3:2"
  | "3:4"
  | "4:3"
  | "4:5"
  | "5:4"
  | "9:16"
  | "16:9"
  | "21:9";

export interface AspectRatioDimensions {
  width: number;
  height: number;
}

export const VALID_ASPECT_RATIOS: Record<AspectRatio, AspectRatioDimensions> = {
  "1:1": { width: 1024, height: 1024 },
  "2:3": { width: 832, height: 1248 },
  "3:2": { width: 1248, height: 832 },
  "3:4": { width: 864, height: 1184 },
  "4:3": { width: 1184, height: 864 },
  "4:5": { width: 896, height: 1152 },
  "5:4": { width: 1152, height: 896 },
  "9:16": { width: 768, height: 1344 },
  "16:9": { width: 1344, height: 768 },
  "21:9": { width: 1536, height: 672 },
} as const;

export const DEFAULT_ASPECT_RATIO: AspectRatio = "1:1";

export const getValidAspectRatios = (): AspectRatio[] => {
  return Object.keys(VALID_ASPECT_RATIOS) as AspectRatio[];
};

export const getAspectRatioDimensions = (
  ratio: AspectRatio,
): AspectRatioDimensions => {
  return VALID_ASPECT_RATIOS[ratio];
};

export const isValidAspectRatio = (ratio: string): ratio is AspectRatio => {
  return ratio in VALID_ASPECT_RATIOS;
};

export const getAspectRatioLabel = (ratio: AspectRatio): string => {
  const dimensions = VALID_ASPECT_RATIOS[ratio];
  const labels: Record<AspectRatio, string> = {
    "1:1": "Square",
    "2:3": "Portrait",
    "3:2": "Landscape",
    "3:4": "Portrait",
    "4:3": "Standard",
    "4:5": "Portrait",
    "5:4": "Standard",
    "9:16": "Mobile Portrait",
    "16:9": "Widescreen",
    "21:9": "Ultrawide",
  };
  return `${labels[ratio]} (${ratio}) - ${dimensions.width}×${dimensions.height}`;
};
