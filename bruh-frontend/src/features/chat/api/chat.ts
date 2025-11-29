import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ChatRequest } from "@/types/api";

type StreamEvent =
  | { type: "metadata"; conversation_id: string; user_message_id: string }
  | { type: "content"; delta: string }
  | { type: "done"; assistant_message_id: string; usage: Record<string, any> }
  | { type: "error"; error: string; conversation_id?: string };

type StreamCallbacks = {
  onMetadata?: (data: Extract<StreamEvent, { type: "metadata" }>) => void;
  onContent?: (data: Extract<StreamEvent, { type: "content" }>) => void;
  onDone?: (data: Extract<StreamEvent, { type: "done" }>) => void;
  onError?: (data: Extract<StreamEvent, { type: "error" }>) => void;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const createStreamingChat = async ({
  data,
  callbacks,
}: {
  data: ChatRequest;
  callbacks: StreamCallbacks;
}): Promise<void> => {
  const stream = await api.post<ReadableStream>("/ai/chat/stream", data, {
    headers: {
      Accept: "text/event-stream",
    },
  });

  if (!stream || typeof stream.getReader !== "function") {
    throw new Error("Invalid stream received from server");
  }

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const text = decoder.decode(value, { stream: true });
      buffer += text;

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;

        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6);

          try {
            const event = JSON.parse(jsonStr) as StreamEvent;

            switch (event.type) {
              case "metadata":
                callbacks.onMetadata?.(event);
                break;
              case "content":
                callbacks.onContent?.(event);
                await sleep(10);
                break;
              case "done":
                callbacks.onDone?.(event);
                break;
              case "error":
                callbacks.onError?.(event);
                break;
            }
          } catch (e) {
            console.error("Failed to parse SSE data:", jsonStr, e);
          }
        }
      }
    }

    if (buffer.trim() && buffer.startsWith("data: ")) {
      try {
        const jsonStr = buffer.slice(6);
        if (jsonStr.trim()) {
          const event = JSON.parse(jsonStr) as StreamEvent;

          switch (event.type) {
            case "metadata":
              callbacks.onMetadata?.(event);
              break;
            case "content":
              callbacks.onContent?.(event);
              await sleep(10);
              break;
            case "done":
              callbacks.onDone?.(event);
              break;
            case "error":
              callbacks.onError?.(event);
              break;
          }
        }
      } catch (e) {
        console.error("Error parsing final SSE data:", e);
      }
    }
  } catch (error) {
    console.error("Stream error:", error);
    throw error;
  } finally {
    reader.releaseLock();
  }
};

export const useCreateStreamingChat = () => {
  return useMutation({
    mutationFn: createStreamingChat,
  });
};
