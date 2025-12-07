import { useState, useRef, useEffect } from "react";
import { ChevronDown, Maximize2 } from "lucide-react";
import {
  getValidAspectRatios,
  getAspectRatioLabel,
  DEFAULT_ASPECT_RATIO,
  type AspectRatio,
} from "@/types/image";

type AspectRatioSelectorProps = {
  selectedRatio?: AspectRatio;
  onRatioChange?: (ratio: AspectRatio) => void;
};

export const AspectRatioSelector = ({
  selectedRatio = DEFAULT_ASPECT_RATIO,
  onRatioChange,
}: AspectRatioSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const availableRatios = getValidAspectRatios();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (ratio: AspectRatio) => {
    onRatioChange?.(ratio);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-muted hover:bg-muted-foreground/10 transition-colors"
      >
        <Maximize2 className="h-4 w-4" />
        <span className="text-muted-foreground">Aspect Ratio:</span>
        <span>{selectedRatio}</span>
        <ChevronDown className="h-4 w-4 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 w-72 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b bg-muted/50">
            <p className="text-xs font-medium text-muted-foreground">
              Select Aspect Ratio
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {availableRatios.map((ratio) => (
              <button
                key={ratio}
                onClick={() => handleSelect(ratio)}
                className={`w-full flex items-start gap-2 px-3 py-2 text-left rounded-md hover:bg-muted/50 transition-colors ${
                  ratio === selectedRatio ? "bg-muted" : ""
                }`}
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {getAspectRatioLabel(ratio)}
                  </div>
                </div>
                {ratio === selectedRatio && (
                  <div className="text-primary">✓</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
