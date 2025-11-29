import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useConversation } from "../api/conversation";
import { useCreateStreamingChat } from "../api/chat";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import type { ConversationsResponse, Conversation, Message } from "@/types/api";

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

  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(
    () => {
      if (!conversationId) {
        const saved = localStorage.getItem(NEW_CHAT_MODEL_KEY);
        return saved || user?.profile?.default_model;
      }
      return user?.profile?.default_model;
    },
  );

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
  }, [conversationData, conversationId, user?.profile?.default_model]);

  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    if (!conversationId) {
      localStorage.setItem(NEW_CHAT_MODEL_KEY, modelId);
    }
  };

  const createChatMutation = useCreateStreamingChat();

  const finalize = () => {
    const data = doneDataRef.current;
    const tempAssistantId = tempAssistantIdRef.current;
    const newConversationId = newConversationIdRef.current;
    const finalContent = contentBufferRef.current; // Capture content before clearing

    setMessages((prev: Message[]) => {
      const updatedMessages = prev.map((msg) =>
        msg.id === tempAssistantId
          ? {
              ...msg,
              content: finalContent, // Use captured content
              id: data.assistant_message_id,
              isStreaming: false,
            }
          : msg,
      );

      setStreamingMessageId(null);

      if (!conversationId && newConversationId) {
        queryClient.setQueryData(["conversations", newConversationId], {
          id: newConversationId,
          messages: updatedMessages,
        });

        // Use setTimeout to ensure state update completes before navigation
        setTimeout(() => {
          navigate({
            to: "/chat/$conversationId",
            params: { conversationId: newConversationId },
            replace: true,
          });
        }, 0);
      }

      return updatedMessages;
    });

    // Clear refs after a small delay to ensure state update completes
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

    // If there's buffered content to display
    if (displayedContentRef.current.length < contentBufferRef.current.length) {
      // Take 2-3 characters at a time for smooth streaming
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
      // All content displayed and streaming is done, finalize
      isStreamingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      finalize();
      return;
    }

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(() =>
      animateContent(tempAssistantId),
    );
  };

  const handleSendMessage = (message: string) => {
    const tempUserId = `temp-user-${Date.now()}`;
    const tempAssistantId = `temp-assistant-${Date.now()}`;
    tempAssistantIdRef.current = tempAssistantId;
    newConversationIdRef.current = undefined;

    // Clear any existing animation and buffers
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    contentBufferRef.current = "";
    displayedContentRef.current = "";
    isStreamingRef.current = false;
    isDoneStreamingRef.current = false;
    doneDataRef.current = null;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: message,
        id: tempUserId,
        conversation_id: conversationId || "",
        created_at: Date.now(),
      },
    ]);

    setMessages((prev) => [
      ...prev,
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
        conversation_id: conversationId,
        message,
        model: selectedModelId,
      },
      callbacks: {
        onMetadata: (data) => {
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

          setMessages((prev: Message[]) =>
            prev.map((msg) =>
              msg.id === tempUserId
                ? { ...msg, id: data.user_message_id }
                : msg,
            ),
          );

          // Start animation on first metadata
          isStreamingRef.current = true;
          animateContent(tempAssistantId);
        },
        onContent: (data) => {
          // Just buffer the content, animation loop will display it
          contentBufferRef.current += data.delta;
        },
        onDone: (data) => {
          // Mark as done but let animation finish displaying remaining content
          isDoneStreamingRef.current = true;
          doneDataRef.current = data;
        },
        onError: (data) => {
          // Clean up on error
          isStreamingRef.current = false;
          isDoneStreamingRef.current = false;
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          contentBufferRef.current = "";
          displayedContentRef.current = "";
          doneDataRef.current = null;
          newConversationIdRef.current = undefined;
          tempAssistantIdRef.current = "";

          console.error("Streaming error:", data.error);
          setMessages((prev: Message[]) =>
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
        onModelSelect={handleModelSelect}
      />
    </div>
  );
};
