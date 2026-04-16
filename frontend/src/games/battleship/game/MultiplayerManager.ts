import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import type { BoardData } from "./Board";

export type PlayerRole = "player1" | "player2" | "player3" | "player4";

export type MultiplayerMessage =
  | { type: "create_room"; roomId: string; maxPlayers?: number }
  | { type: "room_created"; roomId: string }
  | { type: "join"; roomId: string }
  | { type: "welcome"; roomId: string; hostBoard: BoardData }
  | { type: "guest_ready"; roomId: string; guestBoard: BoardData }
  | { type: "player_joined"; roomId: string; playerIndex: number; currentCount: number }
  | { type: "player_ready"; roomId: string; playerIndex: number; boardData: BoardData }
  | { type: "all_players_ready"; roomId: string; boards: (BoardData | null)[] }
  | { type: "game_start_4p"; roomId: string; yourIndex: number; allBoards: (BoardData | null)[] }
  | { type: "attack"; roomId: string; col: number; row: number; by: "host" | "guest" }
  | { type: "attack_result"; roomId: string; col: number; row: number; result: "hit" | "miss"; by: "host" | "guest"; sunkShipName?: string }
  | { type: "attack_4p"; roomId: string; col: number; row: number; byIndex: number; targetBoardIndex: number }
  | { type: "attack_result_4p"; roomId: string; col: number; row: number; result: "hit" | "miss"; byIndex: number; targetBoardIndex: number; sunkShipName?: string; eliminated?: boolean }
  | { type: "game_over"; roomId: string; winner: "host" | "guest" }
  | { type: "game_over_4p"; roomId: string; winnerIndex: number }
  | { type: "player_eliminated_4p"; roomId: string; playerIndex: number }
  | { type: "ping"; roomId: string }
  | { type: "pong"; roomId: string }
  | { type: "opponent_left"; roomId: string }
  | { type: "player_left_4p"; roomId: string; playerIndex: number }
  | { type: "restart_request"; roomId: string; by: "host" | "guest"; boardData: BoardData }
  | { type: "restart_accept"; roomId: string; by: "host" | "guest"; boardData: BoardData }
  | { type: "restart_request_4p"; roomId: string; byIndex: number; boardData: BoardData }
  | { type: "restart_accept_4p"; roomId: string; byIndex: number; boardData: BoardData }
  | { type: "error"; message: string };

export type MessageHandler = (msg: MultiplayerMessage) => void;

function getBrokerUrl(): string {
  const override =
    (import.meta.env.VITE_BATTLESHIP_WS_URL as string | undefined)?.trim() ||
    (import.meta.env.VITE_WS_URL as string | undefined)?.trim();

  if (override) {
    return override;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

function getClientToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `battleship-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseMessage(message: IMessage): MultiplayerMessage | null {
  try {
    return JSON.parse(message.body) as MultiplayerMessage;
  } catch {
    return null;
  }
}

export class MultiplayerManager {
  private _roomId: string;
  private _isHost: boolean;
  private _playerIndex: number;
  private maxPlayers: number;
  private handler: MessageHandler | null = null;

  private clientToken: string;
  private client: Client;
  private clientSubscription: StompSubscription | null = null;
  private connected = false;
  private messageQueue: MultiplayerMessage[] = [];
  private createdRoom = false;

  constructor(roomId: string, isHost: boolean, playerIndex: number = isHost ? 0 : 1, maxPlayers: number = 2) {
    this._roomId = roomId;
    this._isHost = isHost;
    this._playerIndex = playerIndex;
    this.maxPlayers = maxPlayers;
    this.clientToken = getClientToken();

    this.client = new Client({
      brokerURL: getBrokerUrl(),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: () => {},
    });

    this.initStomp();
  }

  private initStomp(): void {
    this.client.onConnect = () => {
      this.connected = true;

      this.clientSubscription?.unsubscribe();
      this.clientSubscription = this.client.subscribe(
        `/topic/battleship/client/${this.clientToken}`,
        (message) => {
          const parsed = parseMessage(message);
          if (parsed && this.handler) {
            this.handler(parsed);
          }
        }
      );

      if (this._isHost && !this.createdRoom) {
        this.publish({
          type: "create_room",
          roomId: this._roomId,
          maxPlayers: this.maxPlayers,
        });
        this.createdRoom = true;
      }

      while (this.messageQueue.length > 0) {
        const queued = this.messageQueue.shift();
        if (queued) {
          this.publish(queued);
        }
      }
    };

    this.client.onDisconnect = () => {
      this.connected = false;
      this.emitError("Lost connection to the Battleship server.");
    };

    this.client.onStompError = (frame) => {
      this.emitError(frame.headers["message"] ?? "Battleship server rejected the connection.");
    };

    this.client.onWebSocketError = () => {
      this.emitError(`Unable to connect to the Battleship server at ${getBrokerUrl()}.`);
    };

    this.client.activate();
  }

  private emitError(message: string): void {
    if (this.handler) {
      this.handler({ type: "error", message });
    }
  }

  private publish(msg: MultiplayerMessage): void {
    const payload: Record<string, unknown> = { ...msg };
    if (msg.type === "create_room" || msg.type === "join") {
      payload.clientToken = this.clientToken;
    }

    this.client.publish({
      destination: "/app/battleship/send",
      body: JSON.stringify(payload),
    });
  }

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

  get isOnlineMode(): boolean {
    return true;
  }

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  send(msg: MultiplayerMessage): void {
    if (this.connected) {
      this.publish(msg);
      return;
    }

    this.messageQueue.push(msg);
  }

  destroy(): void {
    this.handler = null;
    this.messageQueue = [];
    this.connected = false;
    this.clientSubscription?.unsubscribe();
    this.clientSubscription = null;
    void this.client.deactivate();
  }

  static generateRoomId(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let id = "";
    for (let i = 0; i < 6; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
  }

  static getRoomIdFromUrl(): { roomId: string; is4P: boolean } | null {
    const hash = window.location.hash;
    const match4P = hash.match(/^#room4\/([A-Z0-9]+)$/i);
    if (match4P) return { roomId: match4P[1].toUpperCase(), is4P: true };
    const match = hash.match(/^#room\/([A-Z0-9]+)$/i);
    if (match) return { roomId: match[1].toUpperCase(), is4P: false };
    return null;
  }

  static setRoomUrl(roomId: string, is4P: boolean = false): void {
    window.location.hash = is4P ? `room4/${roomId}` : `room/${roomId}`;
  }

  static clearRoomUrl(): void {
    history.replaceState(null, "", window.location.pathname);
  }

  static buildRoomUrl(roomId: string, is4P: boolean = false): string {
    const base = window.location.origin + window.location.pathname;
    return is4P ? `${base}#room4/${roomId}` : `${base}#room/${roomId}`;
  }
}
