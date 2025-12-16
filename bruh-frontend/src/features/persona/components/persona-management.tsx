import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Globe,
  Lock,
  Sparkles,
} from "lucide-react";
import { PersonaFormDialog } from "./persona-form-dialog";
import {
  usePersonasQuery,
  useCreatePersonaMutation,
  useUpdatePersonaMutation,
  useDeletePersonaMutation,
  useGeneratePersonaMutation,
  useUploadPersonaImageMutation,
  useDeletePersonaImageMutation,
} from "../api/persona";
import type { Persona, PersonaCreateRequest } from "@/types/api";
import { toast } from "sonner";
import { ModelSelector } from "@/components/shared/model-selector/model-selector";

export const PersonasManagement = () => {
  const { data: personas, isLoading } = usePersonasQuery();
  const createMutation = useCreatePersonaMutation();
  const updateMutation = useUpdatePersonaMutation();
  const deleteMutation = useDeletePersonaMutation();
  const generatePersonaMutation = useGeneratePersonaMutation();
  const uploadImageMutation = useUploadPersonaImageMutation();
  const deleteImageMutation = useDeletePersonaImageMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [personaToDelete, setPersonaToDelete] = useState<string | null>(null);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(
    undefined,
  );
  const [provider, setProvider] = useState<string | undefined>(undefined);
  const [magicPersonaDescription, setMagicPersonaDescription] = useState("");

  const handleCreate = () => {
    setSelectedPersona(null);
    setDialogOpen(true);
  };

  const handleEdit = (persona: Persona) => {
    setSelectedPersona(persona);
    setDialogOpen(true);
  };

  const handleDeleteClick = (personaId: string) => {
    setPersonaToDelete(personaId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (personaToDelete) {
      await deleteMutation.mutateAsync(personaToDelete);
      setDeleteDialogOpen(false);
      setPersonaToDelete(null);
    }
  };

  const handleSubmit = async (data: PersonaCreateRequest) => {
    if (selectedPersona) {
      await updateMutation.mutateAsync({
        id: selectedPersona.id,
        data,
      });
    } else {
      await createMutation.mutateAsync(data);
    }
    setDialogOpen(false);
    setSelectedPersona(null);
  };

  const handleImageUpload = async (file: File) => {
    if (selectedPersona) {
      await uploadImageMutation.mutateAsync({
        id: selectedPersona.id,
        file,
      });
    }
  };

  const handleImageDelete = async () => {
    if (selectedPersona) {
      await deleteImageMutation.mutateAsync(selectedPersona.id);
    }
  };

  const handleGenerateMagicPersona = () => {
    setModelDialogOpen(true);
  };

  const resetModelDialogState = () => {
    setSelectedModelId(undefined);
    setProvider(undefined);
    setMagicPersonaDescription("");
  };

  const handleModelSelect = (modelId: string, provider: string) => {
    setSelectedModelId(modelId);
    setProvider(provider);
  };

  const handleGenerateMagicPersonaWithModel = async () => {
    if (!selectedModelId || !provider) {
      toast.error("Please select a model first.");
      return;
    }

    try {
      await generatePersonaMutation.mutateAsync({
        prompt: magicPersonaDescription,
        target_provider: provider,
        suggested_model: selectedModelId,
      });
      setModelDialogOpen(false);
      resetModelDialogState();
    } catch (error) {
      toast.error("An unexpected error occurred during persona generation.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI Personas</CardTitle>
              <CardDescription>
                Create and manage custom AI personas with unique instructions
                and behaviors
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4" />
                Create Persona
              </Button>
              <Button onClick={handleGenerateMagicPersona}>
                <Sparkles className="h-4 w-4" /> Magic Persona
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!personas || personas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-3 mb-4">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">No personas yet</h3>
              <p className="text-muted-foreground mb-4 max-w-sm">
                Create your first AI persona to customize how your assistant
                responds
              </p>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Persona
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {personas.map((persona: Persona) => (
                <Card key={persona.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Avatar className="h-12 w-12">
                          <AvatarImage
                            src={persona.persona_image || undefined}
                          />
                          <AvatarFallback>
                            {persona.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            {persona.name}
                            {persona.is_public ? (
                              <Badge variant="secondary" className="gap-1">
                                <Globe className="h-3 w-3" />
                                Public
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1">
                                <Lock className="h-3 w-3" />
                                Private
                              </Badge>
                            )}
                            {!persona.is_active && (
                              <Badge variant="destructive">Inactive</Badge>
                            )}
                          </CardTitle>
                          {persona.description && (
                            <CardDescription className="mt-1.5">
                              {persona.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(persona)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(persona.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-1">Instructions</p>
                      <p className="text-sm text-muted-foreground line-clamp-3 font-mono bg-muted rounded p-2 overflow-y-scroll">
                        {persona.instructions}
                      </p>
                    </div>
                    {persona.model_id && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Model:</span>
                        <Badge variant="outline">{persona.model_id}</Badge>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Created{" "}
                      {new Date(persona.created_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PersonaFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        persona={selectedPersona}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onImageUpload={handleImageUpload}
        onImageDelete={handleImageDelete}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              persona and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Select a Model</AlertDialogTitle>
            <AlertDialogDescription>
              Please select a model and provide a description to generate your
              magic persona.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="p-6">
            <ModelSelector
              selectedModelId={selectedModelId}
              onModelSelect={handleModelSelect}
            />
            <div className="mt-4">
              <label
                htmlFor="description"
                className="block text-sm font-medium mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={magicPersonaDescription}
                onChange={(e) => setMagicPersonaDescription(e.target.value)}
                placeholder="Enter a description for your magic persona."
                className="border rounded p-2 w-full text-sm"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setModelDialogOpen(false);
                resetModelDialogState();
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleGenerateMagicPersonaWithModel}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
