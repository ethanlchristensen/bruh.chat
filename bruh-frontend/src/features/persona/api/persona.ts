import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  Persona,
  PersonaCreateRequest,
  PersonaGenerationRequest,
  PersonaUpdateRequest,
} from "@/types/api";
import { api } from "@/lib/api-client";

const PERSONAS_KEY = ["personas"];

export function usePersonasQuery() {
  return useQuery({
    queryKey: PERSONAS_KEY,
    queryFn: async () => {
      const response = await api.get<Persona[]>("/personas/");
      return response;
    },
  });
}

export function usePersonaQuery(personaId: string | undefined) {
  return useQuery({
    queryKey: [...PERSONAS_KEY, personaId],
    queryFn: async () => {
      if (!personaId) return null;
      const response = await api.get<Persona>(`/personas/${personaId}`);
      return response;
    },
    enabled: !!personaId,
  });
}

export function useCreatePersonaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PersonaCreateRequest) => {
      const response = await api.post<Persona>("/personas/", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSONAS_KEY });
      toast.success("Persona created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create persona");
    },
  });
}

export function useUpdatePersonaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: PersonaUpdateRequest;
    }) => {
      const response = await api.put<Persona>(`/personas/${id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSONAS_KEY });
      toast.success("Persona updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update persona");
    },
  });
}

export function useDeletePersonaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/personas/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSONAS_KEY });
      toast.success("Persona deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete persona");
    },
  });
}

export function useGeneratePersonaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PersonaGenerationRequest) => {
      const response = await api.post<unknown>(
        "/personas/persona/generate",
        data,
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSONAS_KEY });
      toast.success("Magic persona generated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to generate magic persona",
      );
    },
  });
}

export function useUploadPersonaImageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append("profile_image", file);

      const response = await api.post<Persona>(
        `/personas/${id}/image`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSONAS_KEY });
      toast.success("Image uploaded successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to upload image");
    },
  });
}

export function useDeletePersonaImageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<Persona>(`/personas/${id}/image`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSONAS_KEY });
      toast.success("Image deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete image");
    },
  });
}
