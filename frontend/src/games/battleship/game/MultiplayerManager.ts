/**
 * MultiplayerManager.ts - Handles multiplayer communication
 *
 * Supports TWO communication methods:
 *
 * 1. BroadcastChannel (localhost dev)
 *    - Works between browser tabs on the SAME device
 *    - No server needed, great for development
 *
 * 2. WebSocket (production / deployed)
 *    - Works between ANY devices/browsers over the internet
 *    - Requires the WebSocket server (server.js) to be running
 *
 * The manager auto-detects which mode to use:
 * - If running on localhost → uses BroadcastChannel
 * - If running on a deployed URL → uses WebSocket
 *
 * Supports both 2-player and 4-player rooms.
 */

import type{ BoardData } from "./Board";

// ============================================================
// Player Role Types
// ============================================================

/** Player role in online multiplayer */
export type PlayerRole = "player1" | "player2" | "player3" | "player4";

// ============================================================
// Message Types
// ============================================================

/** All possible message types for communication between players */
export type MultiplayerMessage =
  // Room management (2P + 4P)
  | { type: "create_room"; roomId: string; maxPlayers?: number }
  | { type: "room_created"; roomId: string }
  | { type: "join"; roomId: string }
  | { type: "welcome"; roomId: string; hostBoard: BoardData }
  | { type: "guest_ready"; roomId: string; guestBoard: BoardData }
  // 4P room management
  | { type: "player_joined"; roomId: string; playerIndex: number; currentCount: number }
  | { type: "player_ready"; roomId: string; playerIndex: number; boardData: BoardData }
  | { type: "all_players_ready"; roomId: string; boards: (BoardData | null)[] }
  | { type: "game_start_4p"; roomId: string; yourIndex: number; allBoards: (BoardData | null)[] }
  // Attack (2P)
  | { type: "attack"; roomId: string; col: number; row: number; by: "host" | "guest" }
  | { type: "attack_result"; roomId: string; col: number; row: number; result: "hit" | "miss"; by: "host" | "guest"; sunkShipName?: string }
  // Attack (4P)
  | { type: "attack_4p"; roomId: string; col: number; row: number; byIndex: number; targetBoardIndex: number }
  | { type: "attack_result_4p"; roomId: string; col: number; row: number; result: "hit" | "miss"; byIndex: number; targetBoardIndex: number; sunkShipName?: string; eliminated?: boolean }
  // Game over
  | { type: "game_over"; roomId: string; winner: "host" | "guest" }
  | { type: "game_over_4p"; roomId: string; winnerIndex: number }
  | { type: "player_eliminated_4p"; roomId: string; playerIndex: number }
  // Connection management
  | { type: "ping"; roomId: string }
  | { type: "pong"; roomId: string }
  | { type: "opponent_left"; roomId: string }
  | { type: "player_left_4p"; roomId: string; playerIndex: number }
  // Restart (2P)
  | { type: "restart_request"; roomId: string; by: "host" | "guest"; boardData: BoardData }
  | { type: "restart_accept"; roomId: string; by: "host" | "guest"; boardData: BoardData }
  // Restart (4P)
  | { type: "restart_request_4p"; roomId: string; byIndex: number; boardData: BoardData }
  | { type: "restart_accept_4p"; roomId: string; byIndex: number; boardData: BoardData }
  // Error
  | { type: "error"; message: string };

/** Callback for received messages */
export type MessageHandler = (msg: MultiplayerMessage) => void;

// ============================================================
// Auto-detect: should we use WebSocket or BroadcastChannel?
// ============================================================

/**
 * Returns true if we should use WebSocket (deployed environment)
 * Returns false if we should use BroadcastChannel (localhost dev)
 */
function shouldUseWebSocket(): boolean {
  const hostname = window.location.hostname;
  // Use BroadcastChannel only on localhost / 127.0.0.1
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return false;
  }
  // Everything else (deployed) → use WebSocket
  return true;
}

/**
 * Build the WebSocket URL based on current page URL
 * e.g., https://my-app.onrender.com → wss://my-app.onrender.com
 *        http://localhost:3000 → ws://localhost:3000
 */
function getWebSocketUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}`;
}

// ============================================================
// MultiplayerManager Class
// ============================================================

export class MultiplayerManager {
  private _roomId: string;
  private _isHost: boolean;
  private _playerIndex: number; // 0-based player index (0=host)
  private handler: MessageHandler | null = null;
  private pingInterval: number | null = null;
  private useWebSocket: boolean;

  // BroadcastChannel (for localhost)
  private channel: BroadcastChannel | null = null;

  // WebSocket (for deployed)
  private ws: WebSocket | null = null;
  private wsReady = false;
  private messageQueue: MultiplayerMessage[] = [];

  constructor(roomId: string, isHost: boolean, playerIndex: number = isHost ? 0 : 1) {
    this._roomId = roomId;
    this._isHost = isHost;
    this._playerIndex = playerIndex;
    this.useWebSocket = shouldUseWebSocket();

    if (this.useWebSocket) {
      this.initWebSocket();
    } else {
      this.initBroadcastChannel();
    }

    // Heartbeat to detect connection (only for BroadcastChannel)
    if (!this.useWebSocket) {
      this.pingInterval = window.setInterval(() => {
        this.send({ type: "ping", roomId: this._roomId });
      }, 3000);
    }
  }

  // ============================================================
  // BroadcastChannel Setup (localhost)
  // ============================================================

  private initBroadcastChannel(): void {
    // All tabs with the same channel name can communicate
    this.channel = new BroadcastChannel(`battleship_${this._roomId}`);

    this.channel.onmessage = (event: MessageEvent) => {
      const msg = event.data as MultiplayerMessage;
      if (this.handler) {
        this.handler(msg);
      }
    };

    console.log(`[MP] Using BroadcastChannel (localhost mode) — Room: ${this._roomId}`);
  }

  // ============================================================
  // WebSocket Setup (deployed)
  // ============================================================

  private initWebSocket(): void {
    const url = getWebSocketUrl();
    console.log(`[MP] Connecting to WebSocket: ${url} — Room: ${this._roomId}`);

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log("[MP] WebSocket connected!");
      this.wsReady = true;

      // If host, create the room on the server
      if (this._isHost) {
        this.ws!.send(JSON.stringify({
          type: "create_room",
          roomId: this._roomId,
        }));
      }

      // Send any queued messages
      while (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift()!;
        this.ws!.send(JSON.stringify(msg));
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as MultiplayerMessage;

        // Handle errors from server
        if (msg.type === "error") {
          console.error("[MP] Server error:", (msg as { message: string }).message);
        }

        // Forward to handler
        if (this.handler) {
          this.handler(msg);
        }
      } catch (err) {
        console.error("[MP] Error parsing WebSocket message:", err);
      }
    };

    this.ws.onclose = () => {
      console.log("[MP] WebSocket disconnected");
      this.wsReady = false;
    };

    this.ws.onerror = (err) => {
      console.error("[MP] WebSocket error:", err);
    };
  }

  // ============================================================
  // Public API
  // ============================================================

  get roomId(): string {
    return this._roomId;
  }

  get isHost(): boolean {
    return this._isHost;
  }

  get playerIndex(): number {
    return this._playerIndex;
  }

  set playerIndex(value: number) {
    this._playerIndex = value;
  }

  /** Check if using WebSocket mode */
  get isOnlineMode(): boolean {
    return this.useWebSocket;
  }

  /** Set the message handler */
  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  /** Send a message to the other player(s) */
  send(msg: MultiplayerMessage): void {
    if (this.useWebSocket) {
      // WebSocket mode
      if (this.ws && this.wsReady) {
        this.ws.send(JSON.stringify(msg));
      } else {
        // Queue message if not connected yet
        this.messageQueue.push(msg);
      }
    } else {
      // BroadcastChannel mode
      if (this.channel) {
        this.channel.postMessage(msg);
      }
    }
  }

  /** Clean up and disconnect */
  destroy(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    // Notify opponent we're leaving
    this.send({ type: "opponent_left", roomId: this._roomId });

    if (this.useWebSocket) {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
    } else {
      if (this.channel) {
        this.channel.close();
        this.channel = null;
      }
    }

    this.handler = null;
  }

  // ============================================================
  // Static Utility Methods
  // ============================================================

  /** Generate a random 6-character room ID */
  static generateRoomId(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let id = "";
    for (let i = 0; i < 6; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
  }

  /** Get room ID from current URL hash (format: #room/ROOMID or #room4/ROOMID) */
  static getRoomIdFromUrl(): { roomId: string; is4P: boolean } | null {
    const hash = window.location.hash;
    const match4P = hash.match(/^#room4\/([A-Z0-9]+)$/i);
    if (match4P) return { roomId: match4P[1].toUpperCase(), is4P: true };
    const match = hash.match(/^#room\/([A-Z0-9]+)$/i);
    if (match) return { roomId: match[1].toUpperCase(), is4P: false };
    return null;
  }

  /** Set the URL hash to include the room ID */
  static setRoomUrl(roomId: string, is4P: boolean = false): void {
    window.location.hash = is4P ? `room4/${roomId}` : `room/${roomId}`;
  }

  /** Clear the room URL hash */
  static clearRoomUrl(): void {
    history.replaceState(null, "", window.location.pathname);
  }

  /** Build the full shareable URL for a room */
  static buildRoomUrl(roomId: string, is4P: boolean = false): string {
    const base = window.location.origin + window.location.pathname;
    return is4P ? `${base}#room4/${roomId}` : `${base}#room/${roomId}`;
  }
}
