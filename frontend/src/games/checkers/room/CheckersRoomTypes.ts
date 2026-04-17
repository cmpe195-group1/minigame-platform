import type { CheckersState, Player } from "../types";

//build on top of useStompRoomTransport, and define the types for the checkers game room state and participant
import type { BaseRoomParticipant, BaseRoomState } from "@/multiplayer/transport/types";

export interface RoomParticipant extends BaseRoomParticipant {
  pieceColor: Player;
}

export interface RoomState extends BaseRoomState<CheckersState, RoomParticipant> {
  winner: Player | null;
  moveCount: number;
}
