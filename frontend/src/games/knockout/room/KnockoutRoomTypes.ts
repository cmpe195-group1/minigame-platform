import type { KnockoutGameState, Player, ShotReplayPayload } from "../types";
import type { BaseRoomParticipant, BaseRoomState } from "@/multiplayer/transport/types";

export interface RoomParticipant extends BaseRoomParticipant {
  side: Player;
}

export interface RoomState extends BaseRoomState<KnockoutGameState, RoomParticipant> {
  lastShot: ShotReplayPayload | null;
}

export interface ShotReplay {
  puckId: string;
  impulseX: number;
  impulseY: number;
  turnNumber: number;
  shooterClientId: string;
}