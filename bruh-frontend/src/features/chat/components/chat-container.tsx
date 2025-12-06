import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useConversation } from "../api/conversation";
import { useCreateStreamingChat } from "../api/chat";
import { useUserAvailableModels } from "@/components/shared/model-selector/models";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { INTENTS } from "@/types/intent";
import type { ConversationsResponse, Conversation, Message } from "@/types/api";
import type { Intent } from "@/types/intent";
import type { AspectRatio } from "@/types/image";

type ChatContainerProps = {
  conversationId: string | undefined;
};

const NEW_CHAT_MODEL_KEY = "new-chat-model";

export const ChatContainer = ({ conversationId }: ChatContainerProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(
    () => {
      if (!conversationId) {
        const saved = localStorage.getItem(NEW_CHAT_MODEL_KEY);
        return saved || user?.profile?.default_model;
      }
      return user?.profile?.default_model;
    },
  );

  const { data: userModels } = useUserAvailableModels();
  const selectedModel = userModels?.find((m) => m.id === selectedModelId);

  const contentBufferRef = useRef<string>("");
  const displayedContentRef = useRef<string>("");
  const animationFrameRef = useRef<number | null>(null);
  const isStreamingRef = useRef<boolean>(false);
  const isDoneStreamingRef = useRef<boolean>(false);
  const doneDataRef = useRef<any>(null);
  const newConversationIdRef = useRef<string | undefined>(undefined);
  const tempAssistantIdRef = useRef<string>("");

  const { data: conversationData, isLoading } = useConversation({
    conversationId: conversationId!,
    queryConfig: {
      enabled: !!conversationId,
    },
  });

  useEffect(() => {
    if (conversationData?.messages) {
      setMessages(conversationData.messages);
      const lastAssistantMessage = [...conversationData.messages]
        .reverse()
        .find((msg) => msg.role === "assistant");
      if (lastAssistantMessage?.model_id) {
        setSelectedModelId(lastAssistantMessage.model_id);
      } else if (user?.profile?.default_model) {
        setSelectedModelId(user.profile.default_model);
      }
    } else if (!conversationId) {
      setMessages([]);
      const saved = localStorage.getItem(NEW_CHAT_MODEL_KEY);
      setSelectedModelId(saved || user?.profile?.default_model);
    }
  }, [conversationId, conversationData, user?.profile?.default_model]);

  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    if (!conversationId) {
      localStorage.setItem(NEW_CHAT_MODEL_KEY, modelId);
    }
  };

  const createChatMutation = useCreateStreamingChat();

  const finalize = () => {
    const data = doneDataRef.current;
    if (!data || !data.assistant_message_id) {
      console.error("Finalize called without done data.");
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempAssistantIdRef.current
            ? { ...msg, isStreaming: false }
            : msg,
        ),
      );
      setStreamingMessageId(null);
      return;
    }

    const tempAssistantId = tempAssistantIdRef.current;
    const finalContent = contentBufferRef.current;

    setMessages((prev: Message[]) => {
      const updatedMessages = prev.map((msg) =>
        msg.id === tempAssistantId
          ? {
              ...msg,
              content: finalContent,
              id: data.assistant_message_id,
              isStreaming: false,
              generated_images: data.generated_images,
            }
          : msg,
      );

      setStreamingMessageId(null);

      if (!conversationId && newConversationIdRef.current) {
        queryClient.setQueryData(
          ["conversations", newConversationIdRef.current],
          {
            id: newConversationIdRef.current,
            messages: updatedMessages,
          },
        );
        setTimeout(() => {
          navigate({
            to: "/chat/$conversationId",
            params: { conversationId: newConversationIdRef.current! },
            replace: true,
          });
        }, 0);
      }
      return updatedMessages;
    });

    setTimeout(() => {
      contentBufferRef.current = "";
      displayedContentRef.current = "";
      isDoneStreamingRef.current = false;
      doneDataRef.current = null;
      newConversationIdRef.current = undefined;
      tempAssistantIdRef.current = "";
    }, 100);
  };

  const animateContent = (tempAssistantId: string) => {
    if (!isStreamingRef.current) return;

    if (displayedContentRef.current.length < contentBufferRef.current.length) {
      const charsToAdd = Math.min(
        3,
        contentBufferRef.current.length - displayedContentRef.current.length,
      );
      displayedContentRef.current = contentBufferRef.current.slice(
        0,
        displayedContentRef.current.length + charsToAdd,
      );
      setMessages((prev: Message[]) =>
        prev.map((msg) =>
          msg.id === tempAssistantId
            ? { ...msg, content: displayedContentRef.current }
            : msg,
        ),
      );
    } else if (isDoneStreamingRef.current) {
      isStreamingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      finalize();
      return;
    }

    animationFrameRef.current = requestAnimationFrame(() =>
      animateContent(tempAssistantId),
    );
  };

  const handleSendMessage = (message: string, files?: File[], intent: Intent = INTENTS.CHAT, aspectRatio?: AspectRatio) => {
    const tempUserId = `temp-user-${Date.now()}`;
    const tempAssistantId = `temp-assistant-${Date.now()}`;
    tempAssistantIdRef.current = tempAssistantId;
    newConversationIdRef.current = undefined;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    contentBufferRef.current = "";
    displayedContentRef.current = "";
    isStreamingRef.current = false;
    isDoneStreamingRef.current = false;
    doneDataRef.current = null;

    const attachments = files?.map((file) => ({
      id: `temp-${Date.now()}-${Math.random()}`,
      file_url: URL.createObjectURL(file),
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
    }));

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: message,
        id: tempUserId,
        conversation_id: conversationId || "",
        created_at: Date.now(),
        attachments,
      },
      {
        role: "assistant",
        content: "",
        id: tempAssistantId,
        conversation_id: conversationId || "",
        created_at: Date.now(),
        model_id: selectedModelId,
        isStreaming: true,
      },
    ]);

    setStreamingMessageId(tempAssistantId);

    createChatMutation.mutate({
      data: {
        message,
        conversation_id: conversationId,
        model: selectedModelId,
        files,
        intent,
        aspect_ratio: aspectRatio
      },
      callbacks: {
        onIntent: (data: any) => {
          console.log("Intent:", data.intent, "Model:", data.model);
        },
        onMetadata: (data: any) => {
          if (!conversationId && data.conversation_id) {
            newConversationIdRef.current = data.conversation_id;
            localStorage.removeItem(NEW_CHAT_MODEL_KEY);
            queryClient.setQueryData<ConversationsResponse>(
              ["conversations"],
              (old) => {
                if (!old) return old;
                const title =
                  message.length > 50
                    ? message.substring(0, 50) + "..."
                    : message;
                const newConversation: Conversation = {
                  id: data.conversation_id,
                  title,
                  created_at: Date.now(),
                  updated_at: new Date().toISOString(),
                };
                return {
                  conversations: [newConversation, ...old.conversations],
                };
              },
            );
          }
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempUserId
                ? { ...msg, id: data.user_message_id }
                : msg,
            ),
          );
          isStreamingRef.current = true;
          animateContent(tempAssistantId);
        },
        onContent: (data: any) => {
          contentBufferRef.current += data.delta;
        },
        onImageProgress: (data: any) => {
          console.log("Image progress:", data.message);
        },
        onDone: (data: any) => {
          isDoneStreamingRef.current = true;
          doneDataRef.current = data;
        },
        onError: (data: any) => {
          console.error("Streaming error:", data.error);
          isStreamingRef.current = false;
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== tempAssistantId),
          );
          setStreamingMessageId(null);
        },
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        Loading conversation...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <MessageList
        messages={messages}
        isLoading={createChatMutation.isPending && streamingMessageId === null}
      />
      <MessageInput
        onSend={handleSendMessage}
        disabled={createChatMutation.isPending}
        selectedModelId={selectedModelId}
        selectedModel={selectedModel}
        onModelSelect={handleModelSelect}
        conversationId={conversationId}
      />
    </div>
  );
};