import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ChatRequest, GeneratedImage, Reasoning } from "@/types/api";
import type { Intent } from "@/types/intent";

type StreamEvent =
  | {
      type: "intent";
      intent: Intent;
      model: string;
      aspect_ratio?: string;
    }
  | {
      type: "metadata";
      conversation_id: string;
      user_message_id: string;
      has_attachments?: boolean;
    }
  | { type: "content"; delta: string }
  | { type: "reasoning"; delta: string }
  | { type: "reasoning_image"; image_data: string[] }
  | { type: "image_progress"; message: string }
  | {
      type: "done";
      assistant_message_id: string;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
        prompt_cost?: number;
        completion_cost?: number;
      };
      generated_images?: GeneratedImage[];
      reasoning?: Reasoning;
    }
  | { type: "error"; error: string; conversation_id?: string };

type StreamCallbacks = {
  onIntent?: (data: Extract<StreamEvent, { type: "intent" }>) => void;
  onMetadata?: (data: Extract<StreamEvent, { type: "metadata" }>) => void;
  onContent?: (data: Extract<StreamEvent, { type: "content" }>) => void;
  onReasoning?: (data: Extract<StreamEvent, { type: "reasoning" }>) => void;
  onReasoningImage?: (
    data: Extract<StreamEvent, { type: "reasoning_image" }>,
  ) => void;
  onImageProgress?: (
    data: Extract<StreamEvent, { type: "image_progress" }>,
  ) => void;
  onDone?: (data: Extract<StreamEvent, { type: "done" }>) => void;
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
            case "intent":
              callbacks.onIntent?.(event);
              break;

            case "metadata":
              callbacks.onMetadata?.(event);
              break;

            case "content":
              callbacks.onContent?.(event);
              await sleep(10);
              break;

            case "reasoning":
              callbacks.onReasoning?.(event);
              await sleep(10);
              break;

            case "reasoning_image":
              callbacks.onReasoningImage?.(event);
              break;

            case "image_progress":
              callbacks.onImageProgress?.(event);
              break;

            case "done":
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
  if (data.intent) formData.append("intent", data.intent);
  if (data.aspect_ratio) formData.append("aspect_ratio", data.aspect_ratio);

  if (data.files && data.files.length > 0) {
    data.files.forEach((file) => formData.append("files", file));
  }

  const stream = await api.post<ReadableStream>("/ai/chat/stream", formData, {
    headers: { Accept: "text/event-stream" },
  });

  await processStream(stream, callbacks);
};

export const useCreateStreamingChat = () => {
  return useMutation({ mutationFn: createStreamingChat });
};
