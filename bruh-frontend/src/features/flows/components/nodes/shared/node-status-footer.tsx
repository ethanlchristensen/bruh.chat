import { Loader2, CheckCircle2, XCircle, RouteOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface NodeStatusFooterProps {
  status: "idle" | "running" | "success" | "error" | "skipped";
  error?: string;
  executionTime?: number;
  skipReason?: string;
  runningText?: string;
  successText?: string;
}

export const NodeStatusFooter = ({
  status,
  error,
  executionTime,
  skipReason,
  runningText = "Processing...",
  successText = "Complete",
}: NodeStatusFooterProps) => {
  if (status === "idle") return null;

  return (
    <div
      className={`px-4 py-2.5 text-xs font-medium border-t border-border flex items-center gap-2 rounded-b-xl ${
        status === "success"
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : status === "error"
            ? "bg-destructive/10 text-destructive"
            : status === "skipped"
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : "bg-primary/5 text-primary"
      }`}
    >
      {/* <span className="font-bold text-xl">{ status }</span> */}
      {status === "running" ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>{runningText}</span>
        </>
      ) : status === "success" ? (
        <>
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>
            {successText}
            {executionTime ? ` (${executionTime}ms)` : ""}
          </span>
          {executionTime && (
            <Badge variant="secondary" className="ml-auto text-[10px] h-4">
              {executionTime}ms
            </Badge>
          )}
        </>
      ) : status === "skipped" ? (
        <>
          <RouteOff className="w-3.5 h-3.5" />
          <span>{skipReason || "Skipped"}</span>
        </>
      ) : (
        <>
          <XCircle className="w-3.5 h-3.5" />
          <span>{error || "Error"}</span>
        </>
      )}
    </div>
  );
};
