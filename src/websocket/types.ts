/**
 * WebSocket Types and Interfaces
 *
 * Type definitions for WebSocket client, protocol messages, and channel subscriptions.
 */

/**
 * WebSocket ready state enum (matches WebSocket API)
 */
export enum WebSocketReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

/**
 * WebSocket client configuration
 */
export interface WebSocketConfig {
  /** WebSocket server URL (e.g., ws://localhost:8080/ws) */
  url: string;

  /** Enable automatic reconnection on disconnect */
  reconnect?: boolean;

  /** Initial reconnection delay in milliseconds */
  reconnectDelay?: number;

  /** Maximum reconnection delay in milliseconds */
  maxReconnectDelay?: number;

  /** Maximum number of reconnection attempts (0 = unlimited) */
  reconnectAttempts?: number;

  /** Automatically subscribe to channels on connect */
  autoSubscribe?: boolean;

  /** Enable debug logging */
  debug?: boolean;

  /** Ping interval in milliseconds (0 = disable client-side ping) */
  pingInterval?: number;

  /** Pong timeout in milliseconds */
  pongTimeout?: number;
}

/**
 * Channel names available for subscription
 */
export type ChannelName =
  "mailboxes" | "messages" | "settings" | "filters" | "autoreply";

/**
 * Message types for client → server communication
 */
export type ClientMessageType = "subscribe" | "unsubscribe" | "fetch";

/**
 * Message types for server → client communication
 */
export type ServerMessageType = "data" | "update" | "disconnect";

/**
 * Generic subscription parameters (extended by channel-specific params)
 */
export interface BaseSubscriptionParams {
  /** User ID */
  userId: string;

  /** Access token for authentication */
  token: string;
}

/**
 * Mailboxes channel subscription parameters
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface MailboxesSubscriptionParams extends BaseSubscriptionParams {
  // No additional params needed
}

/**
 * Messages channel subscription parameters
 */
export interface MessagesSubscriptionParams extends BaseSubscriptionParams {
  /** Mailbox ID to subscribe to */
  mailboxId: string;
}

/**
 * Settings channel subscription parameters
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SettingsSubscriptionParams extends BaseSubscriptionParams {
  // No additional params needed
}

/**
 * Filters channel subscription parameters
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface FiltersSubscriptionParams extends BaseSubscriptionParams {
  // No additional params needed
}

/**
 * AutoReply channel subscription parameters
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AutoReplySubscriptionParams extends BaseSubscriptionParams {
  // No additional params needed
}

/**
 * Union type for all subscription params
 */
export type SubscriptionParams =
  | MailboxesSubscriptionParams
  | MessagesSubscriptionParams
  | SettingsSubscriptionParams
  | FiltersSubscriptionParams
  | AutoReplySubscriptionParams;

/**
 * Fetch parameters for pagination
 */
export interface FetchParams {
  /** Mailbox ID (for messages channel) */
  mailboxId?: string;

  /** Pagination cursor */
  cursor?: string;
}

/**
 * Client → Server message structure
 */
export interface ClientMessage {
  /** Message type */
  type: ClientMessageType;

  /** Channel name */
  channel: ChannelName;

  /** Message data (subscription params, fetch params, etc.) */
  data: Record<string, any>;
}

/**
 * Server → Client response data
 */
export interface ServerResponseData {
  /** Success flag */
  success: boolean;

  /** Error name (if success = false) */
  error?: string;

  /** Error message (if success = false) */
  message?: string;

  /** Additional response data (channel-specific) */
  [key: string]: any;
}

/**
 * Server → Client message structure
 */
export interface ServerMessage {
  /** Message type */
  type: ServerMessageType;

  /** Channel name */
  channel: string;

  /** Message data */
  data: {
    /** HTTP-like status code */
    code: number;

    /** Response data */
    response: ServerResponseData;
  };
}

/**
 * Subscription response (initial data from subscribe)
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SubscriptionResponse extends ServerResponseData {
  // Channel-specific data extends this interface
}

/**
 * Fetch response (paginated data)
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface FetchResponse extends ServerResponseData {
  // Channel-specific data extends this interface
}

/**
 * Update event data
 */
export interface UpdateEventData {
  /** Event type */
  event?: "created" | "updated" | "deleted";

  /** Updated resource data */
  [key: string]: any;
}

/**
 * Subscription state
 */
export interface SubscriptionState {
  /** Channel name */
  channel: ChannelName;

  /** Subscription parameters */
  params: SubscriptionParams;

  /** Whether subscription is active */
  active: boolean;

  /** Subscription timestamp */
  subscribedAt: number;
}

/**
 * Connection state
 */
export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnecting";

/**
 * WebSocket event handlers map
 */
export interface WebSocketEventMap {
  /** Connection established */
  connected: () => void;

  /** Connection closed */
  disconnected: (code: number, reason: string) => void;

  /** Reconnection attempt */
  reconnecting: (attempt: number, delay: number) => void;

  /** Error occurred */
  error: (error: Error) => void;

  /** Data received (initial subscription response) */
  data: (channel: ChannelName, data: ServerResponseData) => void;

  /** Update received (real-time update) */
  update: (channel: ChannelName, data: ServerResponseData) => void;

  /** State changed */
  stateChange: (oldState: ConnectionState, newState: ConnectionState) => void;
}

/**
 * Event listener type
 */
export type EventListener<T extends keyof WebSocketEventMap> =
  WebSocketEventMap[T];

/**
 * WebSocket client interface
 */
export interface IWebSocketClient {
  /** Current connection state */
  readonly state: ConnectionState;

  /** Current WebSocket ready state */
  readonly readyState: WebSocketReadyState;

  /** Whether client is connected */
  readonly isConnected: boolean;

  /** Whether client is reconnecting */
  readonly isReconnecting: boolean;

  /** Current reconnection attempt number */
  readonly reconnectAttempt: number;

  /** Active subscriptions */
  readonly subscriptions: ReadonlyMap<ChannelName, SubscriptionState>;

  /**
   * Connect to WebSocket server
   * @param auth - User authentication data
   */
  connect(auth: { userId: string; accessToken: string }): Promise<void>;

  /**
   * Disconnect from WebSocket server
   * @param code - Close code
   * @param reason - Close reason
   */
  disconnect(code?: number, reason?: string): void;

  /**
   * Subscribe to a channel
   * @param channel - Channel name
   * @param params - Subscription parameters
   * @returns Promise resolving to subscription response
   */
  subscribe(
    channel: ChannelName,
    params: SubscriptionParams,
  ): Promise<SubscriptionResponse>;

  /**
   * Unsubscribe from a channel
   * @param channel - Channel name
   */
  unsubscribe(channel: ChannelName): Promise<void>;

  /**
   * Fetch more data (pagination)
   * @param channel - Channel name
   * @param params - Fetch parameters
   * @returns Promise resolving to fetch response
   */
  fetch(channel: ChannelName, params: FetchParams): Promise<FetchResponse>;

  /**
   * Add event listener
   * @param event - Event name
   * @param listener - Event listener
   */
  on<T extends keyof WebSocketEventMap>(
    event: T,
    listener: EventListener<T>,
  ): void;

  /**
   * Remove event listener
   * @param event - Event name
   * @param listener - Event listener
   */
  off<T extends keyof WebSocketEventMap>(
    event: T,
    listener: EventListener<T>,
  ): void;

  /**
   * Remove all event listeners for an event
   * @param event - Event name (optional, if not provided removes all listeners)
   */
  removeAllListeners(event?: keyof WebSocketEventMap): void;
}

/**
 * Reconnection options
 */
export interface ReconnectionOptions {
  /** Current attempt number */
  attempt: number;

  /** Maximum attempts */
  maxAttempts: number;

  /** Current delay in milliseconds */
  delay: number;

  /** Maximum delay in milliseconds */
  maxDelay: number;
}

/**
 * Timer handle type (compatible with both browser and React Native)
 */
export type TimerHandle = ReturnType<typeof setTimeout>;
