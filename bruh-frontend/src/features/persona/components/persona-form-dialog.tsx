import type React from "react";
import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, X } from "lucide-react";
import { ModelSelector } from "@/components/shared/model-selector/model-selector";
import type { Persona, PersonaCreateRequest } from "@/types/api.types";

interface PersonaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  persona?: Persona | null;
  onSubmit: (data: PersonaCreateRequest) => Promise<void>;
  isSubmitting: boolean;
  onImageUpload?: (file: File) => Promise<void>;
  onImageDelete?: () => Promise<void>;
}

export function PersonaFormDialog({
  open,
  onOpenChange,
  persona,
  onSubmit,
  isSubmitting,
  onImageUpload,
  onImageDelete,
}: PersonaFormDialogProps) {
  const [formData, setFormData] = useState<PersonaCreateRequest>({
    name: "",
    description: "",
    instructions: "",
    example_dialogue: "",
    model_id: undefined,
    provider: "",
    is_public: false,
    is_active: true,
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (persona) {
      setFormData({
        name: persona.name,
        description: persona.description || "",
        instructions: persona.instructions,
        example_dialogue: persona.example_dialogue || "",
        model_id: persona.model_id || undefined,
        provider: persona.provider,
        is_public: persona.is_public,
        is_active: persona.is_active,
      });
      setImagePreview(persona.persona_image || null);
      setSelectedFile(null);
    } else {
      setFormData({
        name: "",
        description: "",
        instructions: "",
        example_dialogue: "",
        model_id: undefined,
        provider: "",
        is_public: false,
        is_active: true,
      });
      setImagePreview(null);
      setSelectedFile(null);
    }
  }, [persona, open]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageRemove = () => {
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (persona?.persona_image && onImageDelete) {
      onImageDelete();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);

    // Upload image if a new one was selected
    if (selectedFile && onImageUpload) {
      await onImageUpload(selectedFile);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {persona ? "Edit Persona" : "Create New Persona"}
          </DialogTitle>
          <DialogDescription>
            {persona
              ? "Update your persona's details and preferences"
              : "Create a new AI persona with custom instructions and behavior"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Profile Image */}
          <div className="space-y-2">
            <Label>Profile Image</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={imagePreview || undefined} />
                <AvatarFallback>
                  {formData.name.substring(0, 2).toUpperCase() || "??"}
                </AvatarFallback>
              </Avatar>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                </Button>
                {imagePreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleImageRemove}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Helpful Assistant, Code Expert"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Brief description of this persona..."
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">
              Instructions <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) =>
                setFormData({ ...formData, instructions: e.target.value })
              }
              placeholder="You are a helpful assistant who..."
              rows={6}
              className="resize-none font-mono text-sm"
              required
            />
            <p className="text-xs text-muted-foreground">
              System instructions that define how this persona should behave
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="example_dialogue">Example Dialogue</Label>
            <Textarea
              id="example_dialogue"
              value={formData.example_dialogue}
              onChange={(e) =>
                setFormData({ ...formData, example_dialogue: e.target.value })
              }
              placeholder="User: Hello&#10;Assistant: Hi there!..."
              rows={4}
              className="resize-none font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Optional example conversation to guide the AI's responses
            </p>
          </div>

          <div className="space-y-2">
            <Label>Model</Label>
            <ModelSelector
              selectedModelId={formData.model_id}
              onModelSelect={(modelId, provider) => {
                setFormData({
                  ...formData,
                  model_id: modelId,
                  provider: provider || "",
                });
              }}
            />
            <p className="text-xs text-muted-foreground">
              The AI model to use for this persona
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Active</Label>
              <p className="text-xs text-muted-foreground">
                Enable or disable this persona
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_active: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_public">Public</Label>
              <p className="text-xs text-muted-foreground">
                Make this persona available to other users
              </p>
            </div>
            <Switch
              id="is_public"
              checked={formData.is_public}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_public: checked })
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {persona ? "Update" : "Create"} Persona
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
