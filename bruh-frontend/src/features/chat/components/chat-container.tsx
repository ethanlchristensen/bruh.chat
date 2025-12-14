import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useConversation } from "../api/conversation";
import { useCreateStreamingChat } from "../api/chat";
import { useUserAvailableModels } from "@/components/shared/model-selector/models";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { INTENTS } from "@/types/intent";
import type {
  ConversationsResponse,
  Conversation,
  Message,
  Reasoning,
} from "@/types/api";
import type { Intent } from "@/types/intent";
import type { AspectRatio } from "@/types/image";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type ChatContainerProps = {
  conversationId: string | undefined;
};

const NEW_CHAT_MODEL_KEY = "new-chat-model";

export const ChatContainer = ({ conversationId }: ChatContainerProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null,
  );
  const justCreatedConversationRef = useRef<string | null>(null);

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
  const provider = selectedModel?.provider;

  const contentBufferRef = useRef<string>("");
  const displayedContentRef = useRef<string>("");
  const animationFrameRef = useRef<number | null>(null);
  const isStreamingRef = useRef<boolean>(false);
  const isDoneStreamingRef = useRef<boolean>(false);
  const doneDataRef = useRef<any>(null);
  const tempAssistantIdRef = useRef<string>("");
  const reasoningBufferRef = useRef<string>("");
  const reasoningStreamingImagesRef = useRef<
    Array<{ id: string; data: string }>
  >([]);
  const isReasoningActiveRef = useRef<boolean>(false);
  const newConversationIdRef = useRef<string | undefined>(undefined);
  const userMessageRef = useRef<string>("");
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const messageListRef = useRef<{ scrollToBottom: () => void } | null>(null);

  const createChatMutation = useCreateStreamingChat();

  const shouldFetchConversation = Boolean(
    conversationId && conversationId !== justCreatedConversationRef.current,
  );

  const { data: conversationData, isLoading } = useConversation({
    conversationId: conversationId!,
    queryConfig: {
      enabled: shouldFetchConversation,
    },
  });

  const handleScrollToBottom = () => {
    messageListRef.current?.scrollToBottom();
  };

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
      setIsScrolledUp(false);
      const saved = localStorage.getItem(NEW_CHAT_MODEL_KEY);
      setSelectedModelId(saved || user?.profile?.default_model);
    }
  }, [conversationId, conversationData, user?.profile?.default_model]);

  useEffect(() => {
    if (
      conversationId &&
      conversationId !== justCreatedConversationRef.current
    ) {
      justCreatedConversationRef.current = null;
    }
  }, [conversationId]);

  useEffect(() => {
    setIsScrolledUp(false);
  }, [conversationId]);

  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    if (!conversationId) {
      localStorage.setItem(NEW_CHAT_MODEL_KEY, modelId);
    }
  };

  const finalize = () => {
    const data = doneDataRef.current;
    if (!data || !data.assistant_message_id) {
      console.error("Finalize called without done data.");
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempAssistantIdRef.current
            ? {
                ...msg,
                isStreaming: false,
              }
            : msg,
        ),
      );
      setStreamingMessageId(null);
      isReasoningActiveRef.current = false;
      return;
    }

    const tempAssistantId = tempAssistantIdRef.current;
    const finalContent = contentBufferRef.current;

    const finalReasoning = reasoningBufferRef.current
      ? {
          id: `${data.assistant_message_id}-reasoning`,
          content: reasoningBufferRef.current,
          created_at: new Date().toISOString(),
          generated_reasoning_images: data.generated_reasoning_images || [],
        }
      : undefined;

    setMessages((prev: Message[]) => {
      const updatedMessages = prev.map((msg) =>
        msg.id === tempAssistantId
          ? {
              ...msg,
              content: finalContent,
              id: data.assistant_message_id,
              isStreaming: false,
              generated_images: data.generated_images,
              reasoning: finalReasoning,
            }
          : msg,
      );

      setStreamingMessageId(null);
      isReasoningActiveRef.current = false;

      // Update URL after streaming is complete
      if (!conversationId && newConversationIdRef.current) {
        justCreatedConversationRef.current = newConversationIdRef.current;
        setTimeout(() => {
          navigate({
            to: "/",
            search: { c: newConversationIdRef.current },
            replace: true,
          });
        }, 0);
      }

      return updatedMessages;
    });

    setTimeout(() => {
      contentBufferRef.current = "";
      displayedContentRef.current = "";
      reasoningBufferRef.current = "";
      reasoningStreamingImagesRef.current = [];
      isDoneStreamingRef.current = false;
      doneDataRef.current = null;
      newConversationIdRef.current = undefined;
      tempAssistantIdRef.current = "";
      userMessageRef.current = "";
    }, 100);
  };

  const animateContent = (tempAssistantId: string) => {
    if (!isStreamingRef.current) return;

    let needsUpdate = false;

    if (displayedContentRef.current.length < contentBufferRef.current.length) {
      const charsToAdd = Math.min(
        3,
        contentBufferRef.current.length - displayedContentRef.current.length,
      );
      displayedContentRef.current = contentBufferRef.current.slice(
        0,
        displayedContentRef.current.length + charsToAdd,
      );
      needsUpdate = true;
    }

    if (needsUpdate || isReasoningActiveRef.current) {
      setMessages((prev: Message[]) =>
        prev.map((msg) =>
          msg.id === tempAssistantId
            ? {
                ...msg,
                content: displayedContentRef.current,
                reasoning: isReasoningActiveRef.current
                  ? ({
                      id: "temp-reasoning",
                      content: reasoningBufferRef.current,
                      created_at: new Date().toISOString(),
                      generated_reasoning_images: [],
                    } as Reasoning)
                  : msg.reasoning,
              }
            : msg,
        ),
      );
    }

    if (
      isDoneStreamingRef.current &&
      displayedContentRef.current.length === contentBufferRef.current.length
    ) {
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

  const handleSendMessage = (
    message: string,
    files?: File[],
    intent: Intent = INTENTS.CHAT,
    aspectRatio?: AspectRatio,
    provider?: string,
  ) => {
    const tempUserId = `temp-user-${Date.now()}`;
    const tempAssistantId = `temp-assistant-${Date.now()}`;
    tempAssistantIdRef.current = tempAssistantId;
    newConversationIdRef.current = undefined;
    userMessageRef.current = message;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    contentBufferRef.current = "";
    displayedContentRef.current = "";
    reasoningBufferRef.current = "";
    reasoningStreamingImagesRef.current = [];
    isStreamingRef.current = false;
    isDoneStreamingRef.current = false;
    isReasoningActiveRef.current = false;
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
        provider: provider,
        files,
        intent,
        aspect_ratio: aspectRatio,
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
                  userMessageRef.current.length > 50
                    ? userMessageRef.current.substring(0, 50) + "..."
                    : userMessageRef.current;
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
        onReasoning: (data: any) => {
          isReasoningActiveRef.current = true;
          reasoningBufferRef.current += data.delta;
        },
        onReasoningImage: (data: any) => {
          const newImage = {
            id: `reasoning-img-${Date.now()}-${Math.random()}`,
            data: data.image_data,
          };
          reasoningStreamingImagesRef.current = [
            ...reasoningStreamingImagesRef.current,
            newImage,
          ];
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempAssistantIdRef.current ? { ...msg } : msg,
            ),
          );
        },
        onImageProgress: (data: any) => {
          console.log("Image progress:", data.message);
        },
        onDone: (data: any) => {
          isDoneStreamingRef.current = true;
          isReasoningActiveRef.current = false;
          doneDataRef.current = data;
        },
        onError: (data: any) => {
          console.error("Streaming error:", data.error);
          isStreamingRef.current = false;
          isReasoningActiveRef.current = false;
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
      <div className="relative flex flex-col flex-1 min-h-0">
        <MessageList
          ref={messageListRef}
          messages={messages}
          isLoading={
            createChatMutation.isPending && streamingMessageId === null
          }
          onScrollStateChange={setIsScrolledUp}
        />

        {isScrolledUp && (
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-linear-to-t from-background from-20% to-transparent pointer-events-none z-10" />
        )}

        {isScrolledUp && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <Button
              onClick={handleScrollToBottom}
              className="shadow-lg"
              variant={"secondary"}
              size={"sm"}
            >
              <ArrowDown className="h-4 w-4" />
              <span className="text-sm font-medium">Back to bottom</span>
            </Button>
          </div>
        )}
      </div>

      <div className="shrink-0 relative z-20 bg-background">
        <MessageInput
          onSend={handleSendMessage}
          disabled={createChatMutation.isPending}
          selectedModelId={selectedModelId}
          selectedModel={selectedModel}
          onModelSelect={handleModelSelect}
          conversationId={conversationId}
          provider={provider}
        />
      </div>
    </div>
  );
};
