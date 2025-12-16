import { useState, useRef, useEffect } from "react";
import { ChevronDown, User, UserSearch, UserPlus } from "lucide-react";
import { usePersonasQuery } from "@/features/persona/api/persona";
import type { Persona } from "@/types/api";
import { Link } from "@tanstack/react-router";

type PersonaSelectorProps = {
  selectedPersonaId?: string;
  onPersonaChange?: (personaId: string | undefined) => void;
};

export const PersonaSelector = ({
  selectedPersonaId,
  onPersonaChange,
}: PersonaSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: personas, isLoading } = usePersonasQuery();

  const activePersonas = personas?.filter((p) => p.is_active) || [];

  const selectedPersona = activePersonas.find(
    (p) => p.id === selectedPersonaId,
  );

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

  const handleSelect = (persona: Persona) => {
    onPersonaChange?.(persona.id);
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-muted">
        <UserSearch className="h-4 w-4 animate-pulse" />
        <span className="text-muted-foreground">Loading personas...</span>
      </div>
    );
  }

  if (!personas || activePersonas.length === 0) {
    return (
      <Link to="/personas">
        {" "}
        <div className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-muted">
          <UserPlus className="h-4 w-4" />
          <span className="text-muted-foreground">Click to Add a Persona</span>
        </div>
      </Link>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-muted hover:bg-muted-foreground/10 transition-colors"
      >
        <UserSearch className="h-4 w-4" />
        <span className="text-muted-foreground">Persona:</span>
        <span className="truncate max-w-[200px]">
          {selectedPersona ? selectedPersona.name : "Select a persona..."}
        </span>
        <ChevronDown className="h-4 w-4 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 w-80 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b bg-muted/50">
            <p className="text-xs font-medium text-muted-foreground">
              Select a Persona
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {activePersonas.map((persona) => (
              <button
                key={persona.id}
                onClick={() => handleSelect(persona)}
                className={`w-full flex items-start gap-3 px-3 py-2.5 text-left rounded-md hover:bg-muted/50 transition-colors ${
                  persona.id === selectedPersonaId ? "bg-muted" : ""
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {persona.persona_image ? (
                    <img
                      src={persona.persona_image}
                      alt={persona.name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-purple-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{persona.name}</div>
                  {persona.description && (
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {persona.description}
                    </div>
                  )}
                </div>
                {persona.id === selectedPersonaId && (
                  <div className="text-primary shrink-0">✓</div>
                )}
              </button>
            ))}
          </div>
          <div className="p-2 border-t bg-muted/50">
            <p className="text-xs text-muted-foreground">
              {activePersonas.length} persona
              {activePersonas.length !== 1 ? "s" : ""} available
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
