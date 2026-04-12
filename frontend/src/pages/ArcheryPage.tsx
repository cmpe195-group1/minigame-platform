/**
 * ArcheryPage.tsx
 * Root component – orchestrates the three screens:
 *   1. Lobby      – create / join room, waiting room
 *   2. GameCanvas – active multiplayer game
 *   3. FinalResults – winner podium
 *
 * Uses useGameSocket to maintain WebSocket connection.
 */

import React, { useRef } from 'react';
import { useGameSocket } from '../games/archery/network/useGameSocket';
import Lobby           from '../games/archery/components/Lobby';
import GameCanvas      from '../games/archery/components/GameCanvas';
import { FinalResults } from '../games/archery/components/ScoreBoard';

const ArcheryPage: React.FC = () => {
  const {
    connected, room, myId, mySlot, error,
    createRoom, joinRoom, setReady, hostStart, sendArrowShot, clearError,
  } = useGameSocket();

  // Track the last finished room for results screen
  const finishedRoomRef = useRef(room);
  if (room?.state === 'finished') finishedRoomRef.current = room;

  // ── Screen routing ────────────────────────────────────────────────────────────
  const screen: 'lobby' | 'game' | 'results' =
    !room || room.state === 'waiting'               ? 'lobby'   :
    room.state === 'playing'                         ? 'game'    :
    /* room.state === 'finished' */                    'results';

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleRestart = () => {
    // Navigate back to lobby (socket stays open, user creates a new room)
    window.location.reload();
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {screen === 'lobby' && (
        <Lobby
          connected    = {connected}
          room         = {room}
          myId         = {myId}
          mySlot       = {mySlot}
          error        = {error}
          onCreate     = {createRoom}
          onJoin       = {joinRoom}
          onReady      = {setReady}
          onHostStart  = {hostStart}
          onClearError = {clearError}
        />
      )}

      {screen === 'game' && room && (
        <GameCanvas
          room        = {room}
          mySlot      = {mySlot}
          onArrowShot = {sendArrowShot}
        />
      )}

      {screen === 'results' && (finishedRoomRef.current ?? room) && (
        <FinalResults
          room      = {(finishedRoomRef.current ?? room)!}
          mySlot    = {mySlot}
          onRestart = {handleRestart}
        />
      )}
    </>
  );
};

export default ArcheryPage;
