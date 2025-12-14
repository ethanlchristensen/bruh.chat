type OllamaStatusIndicatorProps = {
  status: { running: boolean } | undefined;
};

export const OllamaStatusIndicator = ({
  status,
}: OllamaStatusIndicatorProps) => {
  if (!status) return null;

  return (
    <div className="flex items-center gap-2 text-xs">
      <div
        className={`w-2 h-2 rounded-full ${
          status.running ? "bg-green-500" : "bg-gray-400"
        }`}
      />
      <span className="text-muted-foreground">
        Ollama {status.running ? "Connected" : "Offline"}
      </span>
    </div>
  );
};
