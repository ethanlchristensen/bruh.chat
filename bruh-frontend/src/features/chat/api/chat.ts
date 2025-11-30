import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  ChatRequest,
  ImageGenerationChatRequest,
  GeneratedImage,
} from "@/types/api";

type StreamEvent =
  | { type: "metadata"; conversation_id: string; user_message_id: string }
  | { type: "content"; delta: string }
  | { type: "image_metadata"; conversation_id: string; user_message_id: string }
  | { type: "image_progress"; message: string }
  | {
      type: "done";
      assistant_message_id: string;
      usage: Record<string, any>;
      generated_images?: GeneratedImage[];
    }
  | {
      type: "image_done";
      assistant_message_id: string;
      generated_images: GeneratedImage[];
    }
  | { type: "error"; error: string; conversation_id?: string };

type StreamCallbacks = {
  onMetadata?: (data: any) => void;
  onContent?: (data: Extract<StreamEvent, { type: "content" }>) => void;
  onImageProgress?: (
    data: Extract<StreamEvent, { type: "image_progress" }>,
  ) => void;
  onDone?: (data: any) => void;
  onError?: (data: Extract<StreamEvent, { type: "error" }>) => void;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const processStream = async (
  stream: ReadableStream,
  callbacks: StreamCallbacks,
) => {
  if (!stream || !stream.getReader) {
    throw new Error("Invalid stream response");
  }

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6)) as StreamEvent;
          switch (event.type) {
            case "metadata":
            case "image_metadata":
              callbacks.onMetadata?.(event);
              break;
            case "content":
              callbacks.onContent?.(event);
              await sleep(10);
              break;
            case "image_progress":
              callbacks.onImageProgress?.(event);
              break;
            case "done":
            case "image_done":
              callbacks.onDone?.(event);
              break;
            case "error":
              callbacks.onError?.(event);
              break;
          }
        } catch (e) {
          console.error("Failed to parse SSE data:", line, e);
        }
      }
    }
  } catch (error) {
    console.error("Stream error:", error);
    throw error;
  } finally {
    reader.releaseLock();
  }
};

export const createStreamingChat = async ({
  data,
  callbacks,
}: {
  data: ChatRequest;
  callbacks: StreamCallbacks;
}): Promise<void> => {
  const formData = new FormData();
  if (data.message) formData.append("message", data.message);
  if (data.conversation_id)
    formData.append("conversation_id", data.conversation_id);
  if (data.model) formData.append("model", data.model);
  if (data.files && data.files.length > 0) {
    data.files.forEach((file) => formData.append("files", file));
  }

  const stream = await api.post<ReadableStream>("/ai/chat/stream", formData, {
    headers: { Accept: "text/event-stream" },
  });

  await processStream(stream, callbacks);
};

export const createStreamingImageGeneration = async ({
  data,
  callbacks,
}: {
  data: ImageGenerationChatRequest;
  callbacks: StreamCallbacks;
}): Promise<void> => {
  const stream = await api.post<ReadableStream>(
    "/ai/images/generate/stream",
    data,
    {
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      },
    },
  );

  await processStream(stream, callbacks);
};

export const useCreateStreamingChat = () => {
  return useMutation({ mutationFn: createStreamingChat });
};

export const useCreateStreamingImageGeneration = () => {
  return useMutation({ mutationFn: createStreamingImageGeneration });
};
