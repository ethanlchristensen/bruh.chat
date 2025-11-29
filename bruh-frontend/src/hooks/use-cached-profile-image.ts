import { useQuery } from "@tanstack/react-query";

export function useCachedProfileImage(imageUrl: string | null | undefined) {
  return useQuery({
    queryKey: ["image", imageUrl],
    queryFn: async () => {
      if (!imageUrl) return null;

      const response = await fetch(imageUrl);
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    },
    enabled: !!imageUrl,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}
