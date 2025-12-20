import { type ReactNode } from "react";

interface NodeContainerProps {
  selected: boolean;
  children: ReactNode;
  ringColor?: string;
}

export const NodeContainer = ({
  selected,
  children,
  ringColor = "ring-primary",
}: NodeContainerProps) => {
  return (
    <div
      className={`
        bg-card rounded-xl shadow-xl text-left min-w-[320px] transition-all duration-200
        ${selected ? `ring-2 ${ringColor} border-transparent` : "border border-border"}
      `}
    >
      {children}
    </div>
  );
};
