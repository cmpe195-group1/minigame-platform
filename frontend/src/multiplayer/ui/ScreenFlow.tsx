import { useState } from "react";

export type MultiplayerPageScreen =
  | "main-menu"
  | "local-setup"
  | "local-game"
  | "room-setup"
  | "room-lobby"
  | "room-game";

export interface LocalSetupProps {
  title: string;
  subtitle: string;
  notes: string[];
  startLabel: string;
  onStart: () => void;
  onBack: () => void;
}

export function resolveRoomDrivenScreen(
  screen: MultiplayerPageScreen,
  room: { role: "none" | "host" | "guest"; roomState: { status: string } | null }
): MultiplayerPageScreen {
  if (room.role !== "none" && room.roomState) {
    return room.roomState.status === "waiting" ? "room-lobby" : "room-game";
  }
  return screen;
}

export function useMultiplayerPageFlow<TLocalStatus, TRoomState extends { status : string } | null >(args: {
  defaultLocalStatus: TLocalStatus;
  room: {
    role: "none" | "host" | "guest";
    roomState: TRoomState | null;
  };
}) {
  const [screen, setScreen] = useState<MultiplayerPageScreen>("main-menu");
  const [localStatus, setLocalStatus] = useState(args.defaultLocalStatus);

  const activeScreen = resolveRoomDrivenScreen(screen, args.room);

  return {
    screen,
    setScreen,
    activeScreen,
    localStatus,
    setLocalStatus,
    resetLocalStatus: () => setLocalStatus(args.defaultLocalStatus),
  };
}