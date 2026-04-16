const raw = (import.meta.env.VITE_BACKEND_URL ?? "").trim().replace(/\/+$/, "");

export const BACKEND_URL =
  /^https?:\/\//i.test(raw)
    ? raw
    : raw.includes("localhost") || raw.startsWith("127.0.0.1")
      ? `http://${raw}`
      : `https://${raw}`;

export const WS_URL = `${BACKEND_URL.replace(/^http/, "ws")}/ws`;


//It should accept a config object like:
export interface RoomTransportConfig
{
  gameKey: string;
  createDestination: string;
  joinDestination: string;
  leaveDestination: string;
  startDestination?: string;
  extraDestinations?: Record<string, string>;
}