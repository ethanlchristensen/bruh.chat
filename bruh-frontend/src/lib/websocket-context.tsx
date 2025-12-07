import { createContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { WebSocketClient } from "./websocket-client";
import type {
  WebSocketMessage,
  ConversationUpdateMessage,
} from "./websocket-client";

interface WebSocketContextType {
  send: (data: any) => void;
  isConnected: boolean;
  onMessage: (handler: (data: WebSocketMessage) => void) => () => void;
  onConversationUpdate: (
    handler: (data: ConversationUpdateMessage) => void,
  ) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export { WebSocketContext };

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const { tokens, isAuthenticated } = auth;

  useEffect(() => {
    if (!wsClientRef.current) {
      const wsPath = `/ws/user/`;

      console.log(
        "[WebSocketProvider] Initializing WebSocket with path:",
        wsPath,
      );
      wsClientRef.current = new WebSocketClient(wsPath);

      wsClientRef.current.onConnect(() => setIsConnected(true));
      wsClientRef.current.onDisconnect(() => setIsConnected(false));
    }

    const wsClient = wsClientRef.current;

    if (isAuthenticated && tokens?.access) {
      console.log(
        "[WebSocketProvider] User authenticated, connecting WebSocket...",
      );
      wsClient.connect(tokens.access);
    } else {
      console.log(
        "[WebSocketProvider] User not authenticated, disconnecting WebSocket...",
      );
      wsClient.disconnect();
    }

    return () => {
      wsClient.disconnect();
    };
  }, [isAuthenticated, tokens?.access]);

  const send = (data: any) => {
    wsClientRef.current?.send(data);
  };

  const onMessage = (handler: (data: WebSocketMessage) => void) => {
    return wsClientRef.current?.onMessage(handler) ?? (() => {});
  };

  const onConversationUpdate = (
    handler: (data: ConversationUpdateMessage) => void,
  ) => {
    return (
      wsClientRef.current?.onMessage((data) => {
        if ("conversation_id" in data) {
          handler(data as ConversationUpdateMessage);
        }
      }) ?? (() => {})
    );
  };

  return (
    <WebSocketContext.Provider
      value={{ send, isConnected, onMessage, onConversationUpdate }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}
