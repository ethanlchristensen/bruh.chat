import { useState } from "react";

export const useModelSelectorState = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(
    new Set(),
  );

  const toggleProvider = (providerName: string) => {
    setExpandedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(providerName)) {
        next.delete(providerName);
      } else {
        next.add(providerName);
      }
      return next;
    });
  };

  const resetState = () => {
    setSearchQuery("");
    setExpandedProviders(new Set());
  };

  return {
    isOpen,
    setIsOpen,
    showAddModel,
    setShowAddModel,
    searchQuery,
    setSearchQuery,
    expandedProviders,
    setExpandedProviders,
    toggleProvider,
    resetState,
  };
};
