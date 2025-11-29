export type WebSocketMessage = 
  | ConversationUpdateMessage
  | UserUpdateMessage;

export interface ConversationUpdateMessage {
  type: 'title_updated' | 'new_message';
  conversation_id: string;
  data: {
    new_title?: string;
    [key: string]: any;
  };
}

export interface UserUpdateMessage {
  type: string;
  data: {
    [key: string]: any;
  };
}

type MessageHandler = (data: WebSocketMessage) => void;
type ConnectionHandler = () => void;
type ErrorHandler = (error: Event) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private disconnectionHandlers: Set<ConnectionHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private shouldReconnect = true;
  private reconnectTimer: number | null = null;

  constructor(baseURL: string) {
    this.url = baseURL;
  }

  connect(token: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log("[WebSocket] Already connected");
      return;
    }

    this.shouldReconnect = true;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}${this.url}?token=${token}`;

    console.log("[WebSocket] Connecting to:", wsUrl);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("[WebSocket] ✅ Connected successfully");
      this.reconnectAttempts = 0;
      this.connectionHandlers.forEach((handler) => handler());
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        console.log("[WebSocket] Message received:", data);
        this.messageHandlers.forEach((handler) => handler(data));
      } catch (error) {
        console.error("[WebSocket] Failed to parse message:", error);
      }
    };

    this.ws.onerror = (error) => {
      console.error("[WebSocket] ❌ Error:", error);
      this.errorHandlers.forEach((handler) => handler(error));
    };

    this.ws.onclose = (event) => {
      console.log("[WebSocket] Connection closed:", event.code, event.reason);
      this.disconnectionHandlers.forEach((handler) => handler());

      if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        this.reconnectTimer = setTimeout(() => {
          if (this.shouldReconnect) {
            const tokens = localStorage.getItem("auth_tokens");
            if (tokens) {
              const authTokens = JSON.parse(tokens);
              this.connect(authTokens.access);
            }
          }
        }, delay);
      }
    };
  }

  disconnect(): void {
    console.log("[WebSocket] Disconnecting...");
    this.shouldReconnect = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      console.log("[WebSocket] Message sent:", data);
    } else {
      console.error("[WebSocket] Cannot send message - not connected");
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onConnect(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  onDisconnect(handler: ConnectionHandler): () => void {
    this.disconnectionHandlers.add(handler);
    return () => this.disconnectionHandlers.delete(handler);
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}