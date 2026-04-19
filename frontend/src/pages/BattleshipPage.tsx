/**
 * BattleshipPage.tsx - Main React component for the Battleship game
 *
 * Features:
 * - Mode selection: vs Computer, Local Multiplayer, Online Multiplayer
 * - Online multiplayer with room creation & joining via URL
 * - Auto-detects: BroadcastChannel on localhost, WebSocket when deployed
 * - Status bar, score display, ship sunk notifications
 * - Restart and back-to-menu controls
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { GameCanvas, type GameCanvasHandle } from "../games/battleship/components/GameCanvas";
import { GameLogic, type GameMode, is4PlayerMode } from "../games/battleship/game/GameLogic";
import { Board } from "../games/battleship/game/Board";
import { SHIP_TEMPLATES, TOTAL_SHIP_CELLS } from "../games/battleship/game/Ship";
import { MultiplayerManager, type MultiplayerMessage } from "../games/battleship/game/MultiplayerManager";

// ============================================================
// Helper: safely get roomId from a message (not all types have it)
// ============================================================

function getMsgRoomId(msg: MultiplayerMessage): string | undefined {
  if ("roomId" in msg) {
    return (msg as { roomId: string }).roomId;
  }
  return undefined;
}

// ============================================================
// Mode Selection Screen
// ============================================================

function ModeSelect({ onSelect, initialRoomId }: {
  onSelect: (mode: GameMode, roomId?: string) => void;
  initialRoomId: { roomId: string; is4P: boolean } | null;
}) {
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState(initialRoomId?.roomId || "");

  // Auto-join if URL has room ID
  useEffect(() => {
    if (initialRoomId) {
      const mode = initialRoomId.is4P ? "multiplayer_online_4p" : "multiplayer_online";
      onSelect(mode, initialRoomId.roomId);
    }
  }, [initialRoomId, onSelect]);

  return (
    <div className="min-h-screen bg-[#050e1a] flex flex-col items-center justify-center p-4">
      {/* Title */}
      <div className="text-center mb-10">
        <h1 className="text-6xl font-bold text-white mb-3 tracking-wider">
          <span className="text-blue-400">⚓</span> BATTLESHIP{" "}
          <span className="text-red-400">⚓</span>
        </h1>
        <p className="text-gray-500 text-sm tracking-[0.3em] uppercase">
          Naval Combat Strategy Game
        </p>
        <div className="mt-3 h-px w-64 mx-auto bg-gradient-to-r from-transparent via-blue-700 to-transparent" />
      </div>

      {/* Ship fleet illustration */}
      <div className="mb-10 flex gap-3 items-end">
        {SHIP_TEMPLATES.map((t, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className="bg-gray-600 rounded-sm border border-gray-500"
              style={{ width: 16, height: t.size * 14 }}
            >
              <div className="w-full h-1 bg-red-900/60 mt-auto rounded-b-sm" />
            </div>
            <span className="text-gray-500 text-[10px]">{t.size}</span>
          </div>
        ))}
      </div>

      {/* Mode buttons */}
      <div className="flex flex-col sm:flex-row gap-6 mb-6">
        <button
          onClick={() => onSelect("vs_computer")}
          className="group relative px-10 py-6 rounded-xl bg-gradient-to-br from-blue-900/80 to-blue-950/80 border border-blue-700/40 hover:border-blue-500/60 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-blue-900/30"
        >
          <div className="text-3xl mb-2">🤖</div>
          <div className="text-xl font-bold text-blue-200 mb-1">VS COMPUTER</div>
          <div className="text-sm text-blue-400/70">Play against the AI</div>
        </button>

        <button
          onClick={() => onSelect("multiplayer_local")}
          data-testid="battleship-local-2p-button"
          className="group relative px-10 py-6 rounded-xl bg-gradient-to-br from-emerald-900/80 to-emerald-950/80 border border-emerald-700/40 hover:border-emerald-500/60 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-emerald-900/30"
        >
          <div className="text-3xl mb-2">👥</div>
          <div className="text-xl font-bold text-emerald-200 mb-1">LOCAL 2P</div>
          <div className="text-sm text-emerald-400/70">Same device, take turns</div>
        </button>

        <button
          onClick={() => { setShowJoin(false); onSelect("multiplayer_online"); }}
          className="group relative px-10 py-6 rounded-xl bg-gradient-to-br from-purple-900/80 to-purple-950/80 border border-purple-700/40 hover:border-purple-500/60 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-purple-900/30"
        >
          <div className="text-3xl mb-2">🌐</div>
          <div className="text-xl font-bold text-purple-200 mb-1">ONLINE 2P</div>
          <div className="text-sm text-purple-400/70">Different device / browser</div>
        </button>
      </div>

      {/* 4P Mode buttons */}
      <div className="flex flex-col sm:flex-row gap-6 mb-6">
        <button
          onClick={() => onSelect("multiplayer_local_4p")}
          className="group relative px-10 py-6 rounded-xl bg-gradient-to-br from-orange-900/80 to-orange-950/80 border border-orange-700/40 hover:border-orange-500/60 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-orange-900/30"
        >
          <div className="text-3xl mb-2">👥👥</div>
          <div className="text-xl font-bold text-orange-200 mb-1">LOCAL 4P</div>
          <div className="text-sm text-orange-400/70">Same device, 4 players</div>
        </button>

        <button
          onClick={() => { setShowJoin(false); onSelect("multiplayer_online_4p"); }}
          className="group relative px-10 py-6 rounded-xl bg-gradient-to-br from-pink-900/80 to-pink-950/80 border border-pink-700/40 hover:border-pink-500/60 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-pink-900/30"
        >
          <div className="text-3xl mb-2">🌐</div>
          <div className="text-xl font-bold text-pink-200 mb-1">ONLINE 4P</div>
          <div className="text-sm text-pink-400/70">4 players, different devices</div>
        </button>
      </div>

      {/* Join room input */}
      <div className="flex flex-col items-center gap-3">
        {!showJoin ? (
          <button
            onClick={() => setShowJoin(true)}
            className="text-sm text-gray-500 hover:text-gray-300 underline cursor-pointer transition-colors"
          >
            Have a room code? Join here
          </button>
        ) : (
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Room code (e.g. ABC123)"
              maxLength={6}
              className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-center tracking-widest font-mono text-lg w-48 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={() => joinCode.length >= 4 && onSelect("multiplayer_online", joinCode)}
              disabled={joinCode.length < 4}
              className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold cursor-pointer transition-colors"
            >
              JOIN
            </button>
            <button
              onClick={() => setShowJoin(false)}
              className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 max-w-lg text-center text-gray-600 text-xs leading-relaxed">
        <p>
          Ships are randomly placed. Click on the enemy grid to attack.
          Sink all 5 ships to win! Online mode works across different devices and browsers.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Online Lobby Screen (waiting for opponent)
// ============================================================

function OnlineLobby({ roomId, roomUrl, onCancel, opponentJoined, connectionError }: {
  roomId: string;
  roomUrl: string;
  onCancel: () => void;
  opponentJoined: boolean;
  connectionError: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const input = document.querySelector<HTMLInputElement>("#room-url-input");
      if (input) {
        input.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#050e1a] flex flex-col items-center justify-center p-4">
      <div className="bg-[#0a1929] border border-purple-700/40 rounded-2xl p-8 max-w-lg w-full text-center shadow-2xl">
        <div className="text-4xl mb-4">🌐</div>
        <h2 className="text-2xl font-bold text-purple-200 mb-2">ONLINE ROOM</h2>

        {/* Room Code */}
        <div className="my-6">
          <p className="text-gray-400 text-sm mb-2">Room Code:</p>
          <div className="text-5xl font-mono font-bold text-white tracking-[0.4em] bg-gray-800/60 py-4 rounded-xl border border-gray-700">
            {roomId}
          </div>
        </div>

        {/* Shareable URL */}
        <div className="my-4">
          <p className="text-gray-400 text-sm mb-2">Share this link with your opponent:</p>
          <div className="flex gap-2">
            <input
              id="room-url-input"
              type="text"
              readOnly
              value={roomUrl}
              className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-blue-300 text-sm font-mono focus:outline-none cursor-text"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm cursor-pointer transition-colors whitespace-nowrap"
            >
              {copied ? "✓ Copied!" : "📋 Copy"}
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="my-6 py-4 rounded-lg bg-gray-800/40 border border-gray-700/50">
          {connectionError ? (
            <div className="text-red-400 font-bold text-sm">
              ❌ {connectionError}
            </div>
          ) : opponentJoined ? (
            <div className="text-green-400 font-bold text-lg">
              ✅ Opponent connected! Starting game...
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-yellow-300">
                <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                Waiting for opponent to join...
              </div>
              <p className="text-gray-500 text-xs">
                Send the link above to your opponent (works across devices!)
              </p>
            </div>
          )}
        </div>

        <button
          onClick={onCancel}
          className="px-6 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold cursor-pointer transition-colors"
        >
          ← Cancel
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Main App Component
// ============================================================

type AppScreen = "menu" | "lobby" | "game";

function BattleshipPage() {
  const [screen, setScreen] = useState<AppScreen>("menu");
  const [mode, setMode] = useState<GameMode>("vs_computer");
  const [gameKey, setGameKey] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [statusText, setStatusText] = useState("Your turn — attack!");
  const [statusType, setStatusType] = useState<"p1" | "p2" | "win" | "lose" | "pass" | "waiting">("p1");
  const [score, setScore] = useState({ p1Hits: 0, p2Hits: 0 });
  const [sunkNotification, setSunkNotification] = useState<string | null>(null);

  // Online multiplayer state
  const [multiplayerMgr, setMultiplayerMgr] = useState<MultiplayerManager | null>(null);
  const [roomId, setRoomId] = useState("");
  const [roomUrl, setRoomUrl] = useState("");
  const [opponentJoined, setOpponentJoined] = useState(false);
  const [playerRole, setPlayerRole] = useState<"host" | "guest">("host");
  const [isMyTurn, setIsMyTurn] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [myPlayerIndex, setMyPlayerIndex] = useState(0);
  const [onlinePlayers4P, setOnlinePlayers4P] = useState(1); // count of joined players

  // Game logic ref (needed for online mode)
  const gameLogicRef = useRef<GameLogic | null>(null);
  const canvasRef = useRef<GameCanvasHandle>(null);

  // Check URL for room ID on mount
  const initialRoomId = useRef(MultiplayerManager.getRoomIdFromUrl());

  // ============================================================
  // Sync isMyTurn to Phaser scene for online mode
  // ============================================================

  useEffect(() => {
    if (mode === "multiplayer_online" || mode === "multiplayer_online_4p") {
      const scene = canvasRef.current?.getScene();
      if (scene) {
        scene.setCanAct(isMyTurn && !gameOver);
      }
    }
  }, [isMyTurn, gameOver, mode]);

  // ============================================================
  // Cleanup multiplayer on unmount
  // ============================================================

  useEffect(() => {
    return () => {
      multiplayerMgr?.destroy();
    };
  }, [multiplayerMgr]);

  // ============================================================
  // Mode Selection Handler
  // ============================================================

  const handleModeSelect = useCallback((selectedMode: GameMode, joinRoomId?: string) => {
    if (selectedMode === "multiplayer_online") {
      const isJoining = !!joinRoomId;
      const rid = joinRoomId || MultiplayerManager.generateRoomId();
      const url = MultiplayerManager.buildRoomUrl(rid);

      setRoomId(rid);
      setRoomUrl(url);
      setPlayerRole(isJoining ? "guest" : "host");
      setIsMyTurn(!isJoining); // Host goes first
      setMode("multiplayer_online");
      setConnectionError(null);

      MultiplayerManager.setRoomUrl(rid);

      // Create manager (auto-detects BroadcastChannel vs WebSocket)
      const mgr = new MultiplayerManager(rid, !isJoining);
      setMultiplayerMgr(mgr);

      if (isJoining) {
        // Guest: send join message
        setScreen("lobby");
        setOpponentJoined(false);

        // Create our board
        const myBoard = new Board();
        myBoard.placeShipsRandomly();

        mgr.onMessage((msg: MultiplayerMessage) => {
          // Handle errors
          if (msg.type === "error") {
            setConnectionError(msg.message);
            return;
          }

          const msgRoomId = getMsgRoomId(msg);

          if (msg.type === "welcome" && msgRoomId === rid) {
            // Host acknowledged us, send our board
            mgr.send({
              type: "guest_ready",
              roomId: rid,
              guestBoard: myBoard.toData(),
            });

            // Create game logic with boards
            const logic = new GameLogic("multiplayer_online");
            logic.board1 = myBoard; // Our board (guest's own ships)
            // We don't know opponent's ship positions, use empty board
            const hiddenBoard = new Board();
            logic.board2 = hiddenBoard;
            gameLogicRef.current = logic;

            // Switch to game message handler
            mgr.onMessage(createGameMessageHandler(mgr, rid, "guest", logic));

            setOpponentJoined(true);
            setTimeout(() => {
              setScreen("game");
              setGameKey((k) => k + 1);
            }, 1000);
          } else if (msg.type === "ping" && msgRoomId) {
            mgr.send({ type: "pong", roomId: msgRoomId });
          }
        });

        // Send join request
        mgr.send({ type: "join", roomId: rid });
      } else {
        // Host: wait for guest
        setScreen("lobby");
        setOpponentJoined(false);

        const myBoard = new Board();
        myBoard.placeShipsRandomly();

        mgr.onMessage((msg: MultiplayerMessage) => {
          if (msg.type === "error") {
            setConnectionError(msg.message);
            return;
          }

          const msgRoomId = getMsgRoomId(msg);

          if (msg.type === "join" && msgRoomId === rid) {
            // Guest wants to join, send welcome with our board data
            mgr.send({
              type: "welcome",
              roomId: rid,
              hostBoard: myBoard.toData(),
            });
          } else if (msg.type === "guest_ready" && msgRoomId === rid) {
            // Guest sent their board, create game logic
            const logic = new GameLogic("multiplayer_online");
            logic.board1 = myBoard; // Our board
            const guestBoard = Board.fromData(msg.guestBoard);
            logic.board2 = guestBoard; // We can attack this

            gameLogicRef.current = logic;

            // Set up game message handler
            mgr.onMessage(createGameMessageHandler(mgr, rid, "host", logic));

            setOpponentJoined(true);
            setTimeout(() => {
              setScreen("game");
              setGameKey((k) => k + 1);
            }, 1000);
          } else if (msg.type === "ping" && msgRoomId) {
            mgr.send({ type: "pong", roomId: msgRoomId });
          }
        });
      }
    } else if (selectedMode === "multiplayer_online_4p") {
      // Online 4P mode
      const isJoining = !!joinRoomId;
      const rid = joinRoomId || MultiplayerManager.generateRoomId();
      const url = MultiplayerManager.buildRoomUrl(rid, true);

      setRoomId(rid);
      setRoomUrl(url);
      setPlayerRole(isJoining ? "guest" : "host");
      setMyPlayerIndex(isJoining ? -1 : 0); // Will be set on join
      setIsMyTurn(!isJoining); // Host goes first
      setMode("multiplayer_online_4p");
      setConnectionError(null);
      setOnlinePlayers4P(1);

      MultiplayerManager.setRoomUrl(rid, true);

      const mgr = new MultiplayerManager(rid, !isJoining, isJoining ? -1 : 0, 4);
      setMultiplayerMgr(mgr);

      if (isJoining) {
        // Joining player
        setScreen("lobby");
        setOpponentJoined(false);

        const myBoard = new Board();
        myBoard.placeShipsRandomly();

        mgr.onMessage((msg: MultiplayerMessage) => {
          if (msg.type === "error") {
            setConnectionError(msg.message);
            return;
          }

          if (msg.type === "player_joined") {
            setOnlinePlayers4P(msg.currentCount);

            if (mgr.playerIndex === -1) {
              setMyPlayerIndex(msg.playerIndex);
              mgr.playerIndex = msg.playerIndex;

              mgr.send({
                type: "player_ready",
                roomId: rid,
                playerIndex: msg.playerIndex,
                boardData: myBoard.toData(),
              });
            }
          }

          if (msg.type === "game_start_4p" && "yourIndex" in msg) {
            // Game starting!
            const logic = new GameLogic("multiplayer_online_4p");
            logic.board1 = myBoard;
            // Set boards from server data (we only fully know our own)
            // Other boards are hidden (empty) - attacks are validated server-side
            logic.board2 = new Board();
            logic.board3 = new Board();
            logic.board4 = new Board();

            const myIdx = msg.yourIndex;
            setMyPlayerIndex(myIdx);
            mgr.playerIndex = myIdx;

            gameLogicRef.current = logic;

            // Set up game message handler
            mgr.onMessage(createGameMessageHandler4P(mgr, rid, myIdx, logic));

            setOpponentJoined(true);
            setIsMyTurn(myIdx === 0);
            setTimeout(() => {
              setScreen("game");
              setGameKey((k) => k + 1);
            }, 1000);
          }
        });

        mgr.send({ type: "join", roomId: rid });
      } else {
        // Host for 4P
        setScreen("lobby");
        setOpponentJoined(false);
        setMyPlayerIndex(0);

        const myBoard = new Board();
        myBoard.placeShipsRandomly();

        const playerBoards: (Board | null)[] = [myBoard, null, null, null];
        mgr.onMessage((msg: MultiplayerMessage) => {
          if (msg.type === "error") {
            setConnectionError(msg.message);
            return;
          }

          if (msg.type === "player_ready" && "boardData" in msg) {
            const idx = msg.playerIndex;
            if (idx < 1 || idx > 3) return;

            playerBoards[idx] = Board.fromData(msg.boardData);
            const readyCount = playerBoards.filter((board) => board !== null).length;
            setOnlinePlayers4P(readyCount);

            if (playerBoards.every((board) => board !== null)) {
              // All players ready - start the game
              const logic = new GameLogic("multiplayer_online_4p");
              logic.board1 = playerBoards[0]!;
              logic.board2 = playerBoards[1]!;
              logic.board3 = playerBoards[2]!;
              logic.board4 = playerBoards[3]!;

              gameLogicRef.current = logic;

              // Send game_start_4p to all (broadcast)
              mgr.send({
                type: "game_start_4p",
                roomId: rid,
                yourIndex: 0, // This is for ourselves
                allBoards: playerBoards.map(b => b?.toData() || null),
              });

              mgr.onMessage(createGameMessageHandler4P(mgr, rid, 0, logic));

              setOpponentJoined(true);
              setIsMyTurn(true);
              setTimeout(() => {
                setScreen("game");
                setGameKey((k) => k + 1);
              }, 1000);
            }
          }

          if (msg.type === "ping" && "roomId" in msg) {
            mgr.send({ type: "pong", roomId: rid });
          }
        });
      }
    } else {
      // Local modes (vs_computer, multiplayer_local, multiplayer_local_4p)
      setMode(selectedMode);
      const logic = new GameLogic(selectedMode);
      gameLogicRef.current = logic;
      setMyPlayerIndex(0);
      setScreen("game");
      setGameKey((k) => k + 1);
    }
  }, []);

  // ============================================================
  // Online Multiplayer Message Handler (during gameplay)
  // ============================================================

  const createGameMessageHandler = useCallback((
    mgr: MultiplayerManager,
    rid: string,
    role: "host" | "guest",
    logic: GameLogic,
  ) => {
    return (msg: MultiplayerMessage) => {
      // Skip error messages and messages without roomId
      if (msg.type === "error") {
        console.warn("[MP] Server error:", msg.message);
        return;
      }

      const msgRoomId = getMsgRoomId(msg);
      if (msgRoomId !== rid) return;

      if (msg.type === "attack") {
        // Opponent is attacking our board
        const attackerRole = msg.by;
        if (attackerRole === role) return; // Ignore our own attacks

        const result = logic.board1.receiveAttack(msg.col, msg.row);
        if (result === "invalid") return;

        // Check if any ship was sunk
        let sunkShipName: string | undefined;
        for (const ship of logic.board1.ships) {
          if (logic.board1.isShipSunk(ship)) {
            for (let i = 0; i < ship.size; i++) {
              const sc = ship.horizontal ? ship.x + i : ship.x;
              const sr = ship.horizontal ? ship.y : ship.y + i;
              if (sc === msg.col && sr === msg.row) {
                sunkShipName = ship.name;
                break;
              }
            }
          }
        }

        // Check if we lost
        const gameover = logic.board1.allShipsSunk();
        if (gameover) {
          logic.status = "player2_wins";
        }

        // Send result back
        mgr.send({
          type: "attack_result",
          roomId: rid,
          col: msg.col,
          row: msg.row,
          result: result as "hit" | "miss",
          by: msg.by,
          sunkShipName,
        });

        // Update our display — opponent attacked our left grid
        const scene = canvasRef.current?.getScene();
        if (scene) {
          scene.applyOpponentAttack(msg.col, msg.row, result as "hit" | "miss");
        }

        if (gameover) {
          mgr.send({ type: "game_over", roomId: rid, winner: attackerRole });
          setGameOver(true);
          setStatusText("💀 Defeat! Your fleet is destroyed!");
          setStatusType("lose");
          setScore((s) => ({ ...s, p2Hits: logic.board1.getHitCount() }));
        } else {
          // It's now our turn
          logic.turn = "player1";
          setIsMyTurn(true);
          setStatusText("🎯 Your turn — attack!");
          setStatusType("p1");
          setScore((s) => ({ ...s, p2Hits: logic.board1.getHitCount() }));
        }
      }

      if (msg.type === "attack_result") {
        // Result of our attack on opponent
        if (msg.by !== role) return;

        // Update our target board (board2) with the result
        if (msg.result === "hit") {
          logic.board2.cells[msg.row][msg.col] = "hit";
        } else {
          logic.board2.cells[msg.row][msg.col] = "miss";
        }

        // Show sunk notification
        if (msg.sunkShipName) {
          setSunkNotification(`💥 ${msg.sunkShipName} SUNK!`);
          setTimeout(() => setSunkNotification(null), 2500);
        }

        // Show effect on our right grid
        const scene = canvasRef.current?.getScene();
        if (scene) {
          scene.applyOurAttackResult(msg.col, msg.row, msg.result, msg.sunkShipName);
        }

        setScore((s) => ({ ...s, p1Hits: logic.board2.getHitCount() }));

        // Now it's opponent's turn
        setIsMyTurn(false);
        setStatusText("⏳ Waiting for opponent's attack...");
        setStatusType("waiting");
      }

      if (msg.type === "game_over") {
        const weWon = msg.winner === role;
        setGameOver(true);
        logic.status = weWon ? "player1_wins" : "player2_wins";
        if (weWon) {
          setStatusText("🎉 Victory! All enemy ships destroyed!");
          setStatusType("win");
          const scene = canvasRef.current?.getScene();
          if (scene) scene.showGameOverReveal(true);
        } else {
          setStatusText("💀 Defeat! Your fleet is destroyed!");
          setStatusType("lose");
        }
      }

      if (msg.type === "opponent_left") {
        setStatusText("⚠️ Opponent disconnected!");
        setStatusType("lose");
        setGameOver(true);
      }

      if (msg.type === "restart_request") {
        if (msg.by === role) return;
        // Auto-accept: create new board, send ours back
        const newBoard = new Board();
        newBoard.placeShipsRandomly();
        logic.board1 = newBoard;
        logic.board2 = Board.fromData(msg.boardData);
        logic.status = "playing";
        logic.turn = "player1";

        mgr.send({
          type: "restart_accept",
          roomId: rid,
          by: role,
          boardData: newBoard.toData(),
        });

        setIsMyTurn(role === "host");
        setGameOver(false);
        setStatusText(role === "host" ? "🎯 Your turn — attack!" : "⏳ Waiting for opponent...");
        setStatusType(role === "host" ? "p1" : "waiting");
        setScore({ p1Hits: 0, p2Hits: 0 });
        setSunkNotification(null);
        setGameKey((k) => k + 1);
      }

      if (msg.type === "restart_accept") {
        if (msg.by === role) return;
        logic.board2 = Board.fromData(msg.boardData);
        logic.status = "playing";
        logic.turn = "player1";

        setIsMyTurn(role === "host");
        setGameOver(false);
        setStatusText(role === "host" ? "🎯 Your turn — attack!" : "⏳ Waiting for opponent...");
        setStatusType(role === "host" ? "p1" : "waiting");
        setScore({ p1Hits: 0, p2Hits: 0 });
        setSunkNotification(null);
        setGameKey((k) => k + 1);
      }

      if (msg.type === "ping") {
        mgr.send({ type: "pong", roomId: rid });
      }
    };
  }, []);

  // ============================================================
  // Online 4P Message Handler (during gameplay)
  // ============================================================

  const createGameMessageHandler4P = useCallback((
    mgr: MultiplayerManager,
    rid: string,
    myIdx: number,
    logic: GameLogic,
  ) => {
    return (msg: MultiplayerMessage) => {
      if (msg.type === "error") return;
      const msgRoomId = getMsgRoomId(msg);
      if (msgRoomId !== rid) return;

      if (msg.type === "attack_4p") {
        // Someone is attacking a board
        const attackerIdx = msg.byIndex;
        const targetIdx = msg.targetBoardIndex;
        if (attackerIdx === myIdx) return; // Ignore own attacks

        // If the target is our board, process the attack
        if (targetIdx === myIdx) {
          const result = logic.board1.receiveAttack(msg.col, msg.row);
          if (result === "invalid") return;

          let sunkShipName: string | undefined;
          for (const ship of logic.board1.ships) {
            if (logic.board1.isShipSunk(ship)) {
              for (let i = 0; i < ship.size; i++) {
                const sc = ship.horizontal ? ship.x + i : ship.x;
                const sr = ship.horizontal ? ship.y : ship.y + i;
                if (sc === msg.col && sr === msg.row) {
                  sunkShipName = ship.name;
                  break;
                }
              }
            }
          }

          const eliminated = logic.board1.allShipsSunk();

          mgr.send({
            type: "attack_result_4p",
            roomId: rid,
            col: msg.col,
            row: msg.row,
            result: result as "hit" | "miss",
            byIndex: attackerIdx,
            targetBoardIndex: targetIdx,
            sunkShipName,
            eliminated,
          });

          // Update our display
          const scene = canvasRef.current?.getScene();
          if (scene) {
            scene.applyAttackResult4P(targetIdx, msg.col, msg.row, result as "hit" | "miss");
          }

          if (eliminated) {
            // We were eliminated
            logic.eliminatedPlayers.add(`player${myIdx + 1}` as any);
          }

          // Advance turn (it's now the next player's turn)
          logic.advanceTurn4P();
          const nowMyTurn = logic.turn === `player${myIdx + 1}`;
          setIsMyTurn(nowMyTurn);
          setStatusText(nowMyTurn ? "🎯 Your turn!" : `⏳ Player ${parseInt(logic.turn.replace('player', ''))}'s turn...`);
          setStatusType(nowMyTurn ? "p1" : "waiting");
        }

        // If the target is not us, just update display from the result that'll come
      }

      if (msg.type === "attack_result_4p") {
        const targetIdx = msg.targetBoardIndex;

        // Update target board cells
        const targetBoard = logic.getBoardByIndex(targetIdx);
        if (msg.result === "hit") {
          targetBoard.cells[msg.row][msg.col] = "hit";
        } else {
          targetBoard.cells[msg.row][msg.col] = "miss";
        }

        if (msg.eliminated) {
          logic.eliminatedPlayers.add(`player${targetIdx + 1}` as any);
        }

        if (msg.sunkShipName) {
          setSunkNotification(`💥 ${msg.sunkShipName} SUNK!`);
          setTimeout(() => setSunkNotification(null), 2500);
        }

        // Show effect on the grid
        const scene = canvasRef.current?.getScene();
        if (scene) {
          scene.applyAttackResult4P(targetIdx, msg.col, msg.row, msg.result, msg.sunkShipName);
        }

        // Advance turn
        logic.advanceTurn4P();
        const nowMyTurn = logic.turn === `player${myIdx + 1}`;
        setIsMyTurn(nowMyTurn);
        setStatusText(nowMyTurn ? "🎯 Your turn!" : `⏳ Player ${parseInt(logic.turn.replace('player', ''))}'s turn...`);
        setStatusType(nowMyTurn ? "p1" : "waiting");

        // Check win
        const activePlayers = logic.getActivePlayers();
        if (activePlayers.length === 1) {
          const winner = activePlayers[0];
          logic.status = `${winner}_wins` as any;
          setGameOver(true);
          if (winner === `player${myIdx + 1}`) {
            setStatusText("🎉 Victory! You are the last fleet standing!");
            setStatusType("win");
          } else {
            setStatusText(`💀 ${winner.replace('player', 'Player ')} wins!`);
            setStatusType("lose");
          }
        }
      }

      if (msg.type === "game_over_4p") {
        const weWon = msg.winnerIndex === myIdx;
        setGameOver(true);
        if (weWon) {
          setStatusText("🎉 Victory! You are the last fleet standing!");
          setStatusType("win");
        } else {
          setStatusText(`💀 Player ${msg.winnerIndex + 1} wins!`);
          setStatusType("lose");
        }
      }

      if (msg.type === "player_left_4p") {
        logic.eliminatedPlayers.add(`player${msg.playerIndex + 1}` as any);
        setStatusText(`⚠️ Player ${msg.playerIndex + 1} disconnected!`);
      }

      if (msg.type === "ping") {
        mgr.send({ type: "pong", roomId: rid });
      }
    };
  }, []);

  // ============================================================
  // Status Change Handler (from Phaser)
  // ============================================================

  const handleStatusChange = useCallback(
    (
      status: string,
      turn: string,
      extra?: {
        sunkShip?: string;
        board1Hits?: number;
        board2Hits?: number;
        waitingForPass?: boolean;
      }
    ) => {
      if (mode === "multiplayer_online" || mode === "multiplayer_online_4p") return;

      if (extra) {
        setScore({
          p1Hits: extra.board2Hits ?? 0,
          p2Hits: extra.board1Hits ?? 0,
        });
      }

      if (extra?.sunkShip) {
        setSunkNotification(`💥 ${extra.sunkShip} SUNK!`);
        setTimeout(() => setSunkNotification(null), 2500);
      }

      if (extra?.waitingForPass) {
        setStatusText("🔄 Pass the device to the other player");
        setStatusType("pass");
        return;
      }

      if (status === "player1_wins") {
        const winner = mode === "vs_computer" ? "You win" : "Player 1 wins";
        setStatusText(`🎉 ${winner}! All enemy ships destroyed!`);
        setGameOver(true);
        setStatusType("win");
      } else if (status === "player2_wins") {
        const winner = mode === "vs_computer" ? "Computer wins" : "Player 2 wins";
        setStatusText(`💀 ${winner}! Your fleet is destroyed!`);
        setGameOver(true);
        setStatusType("lose");
      } else if (status === "player3_wins") {
        setStatusText("🎉 Player 3 wins!");
        setGameOver(true);
        setStatusType("lose");
      } else if (status === "player4_wins") {
        setStatusText("🎉 Player 4 wins!");
        setGameOver(true);
        setStatusType("lose");
      } else if (turn === "player1") {
        if (mode === "vs_computer") {
          setStatusText("🎯 Your turn — click on Enemy Waters!");
        } else if (is4PlayerMode(mode)) {
          setStatusText("🎯 Player 1's turn — attack any opponent!");
        } else {
          setStatusText("🎯 Player 1's turn — attack!");
        }
        setStatusType("p1");
      } else if (turn === "player2") {
        if (mode === "vs_computer") {
          setStatusText("⏳ Computer is attacking...");
        } else {
          setStatusText("🎯 Player 2's turn — attack!");
        }
        setStatusType("p2");
      } else if (turn === "player3") {
        setStatusText("🎯 Player 3's turn — attack!");
        setStatusType("p2");
      } else if (turn === "player4") {
        setStatusText("🎯 Player 4's turn — attack!");
        setStatusType("p2");
      }
    },
    [mode]
  );

  // ============================================================
  // Online Attack Handler (player clicked on enemy grid)
  // ============================================================

  const handlePlayerAttack = useCallback((col: number, row: number) => {
    if (!multiplayerMgr || !isMyTurn || gameOver) return;

    if (mode === "multiplayer_online_4p") {
      const scene = canvasRef.current?.getScene();
      const targetBoardIndex = scene?.getLastAttackTargetBoard() ?? -1;
      if (targetBoardIndex === -1) return;

      multiplayerMgr.send({
        type: "attack_4p",
        roomId: multiplayerMgr.roomId,
        col,
        row,
        byIndex: myPlayerIndex,
        targetBoardIndex,
      });
    } else {
      multiplayerMgr.send({
        type: "attack",
        roomId: multiplayerMgr.roomId,
        col,
        row,
        by: playerRole,
      });
    }
  }, [multiplayerMgr, isMyTurn, gameOver, playerRole, mode, myPlayerIndex]);

  // ============================================================
  // Restart & Navigation
  // ============================================================

  const handleRestart = () => {
    if (mode === "multiplayer_online" && multiplayerMgr) {
      const newBoard = new Board();
      newBoard.placeShipsRandomly();
      const logic = gameLogicRef.current;
      if (logic) {
        logic.board1 = newBoard;
        logic.board2 = new Board();
        logic.status = "playing";
      }

      multiplayerMgr.send({
        type: "restart_request",
        roomId: multiplayerMgr.roomId,
        by: playerRole,
        boardData: newBoard.toData(),
      });

      setStatusText("⏳ Waiting for opponent to accept restart...");
      setStatusType("waiting");
      return;
    }

    // For 4P online, just go back to menu
    if (mode === "multiplayer_online_4p") {
      handleBackToMenu();
      return;
    }

    const logic = new GameLogic(mode);
    gameLogicRef.current = logic;
    setGameKey((k) => k + 1);
    setGameOver(false);
    setStatusText("🎯 Your turn — attack!");
    setStatusType("p1");
    setScore({ p1Hits: 0, p2Hits: 0 });
    setSunkNotification(null);
  };

  const handleBackToMenu = () => {
    multiplayerMgr?.destroy();
    setMultiplayerMgr(null);
    setOpponentJoined(false);
    setConnectionError(null);
    MultiplayerManager.clearRoomUrl();
    setScreen("menu");
    setMode("vs_computer");
    setGameOver(false);
    setStatusText("Your turn — attack!");
    setStatusType("p1");
    setScore({ p1Hits: 0, p2Hits: 0 });
    setSunkNotification(null);
    gameLogicRef.current = null;
    initialRoomId.current = null;
  };

  // ============================================================
  // Render: Menu Screen
  // ============================================================

  if (screen === "menu") {
    return <ModeSelect onSelect={handleModeSelect} initialRoomId={initialRoomId.current} />;
  }

  // ============================================================
  // Render: Lobby Screen (online waiting)
  // ============================================================

  if (screen === "lobby") {
    return (
      <OnlineLobby
        roomId={roomId}
        roomUrl={roomUrl}
        onCancel={handleBackToMenu}
        opponentJoined={opponentJoined}
        connectionError={connectionError}
      />
    );
  }

  // ============================================================
  // Render: Game Screen
  // ============================================================

  const statusBarClass = {
    p1: "bg-blue-900/60 border-blue-500/40 text-blue-200",
    p2: "bg-amber-900/50 border-amber-500/40 text-amber-200",
    win: "bg-green-900/50 border-green-500/50 text-green-300",
    lose: "bg-red-900/50 border-red-500/50 text-red-300",
    pass: "bg-purple-900/50 border-purple-500/40 text-purple-200",
    waiting: "bg-amber-900/50 border-amber-500/40 text-amber-200",
  }[statusType];

  const gameLogic = gameLogicRef.current || new GameLogic(mode);
  if (!gameLogicRef.current) {
    gameLogicRef.current = gameLogic;
  }

  const modeLabel = {
    vs_computer: "Player vs Computer",
    multiplayer_local: "Local Multiplayer — 2 Players",
    multiplayer_online: `Online — Room: ${roomId} (${playerRole === "host" ? "Host" : "Guest"})`,
    multiplayer_local_4p: "Local Multiplayer — 4 Players",
    multiplayer_online_4p: `Online 4P — Room: ${roomId} (Player ${myPlayerIndex + 1})`,
  }[mode];

  return (
    <div className="min-h-screen bg-[#050e1a] flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-3">
        <h1 className="text-4xl font-bold text-white tracking-wider">
          <span className="text-blue-400">⚓</span> BATTLESHIP{" "}
          <span className="text-red-400">⚓</span>
        </h1>
        <p className="text-gray-600 text-xs tracking-widest uppercase mt-1" data-testid="battleship-mode-label">
          {modeLabel}
        </p>
      </div>

      {/* Score Bar */}
      <div className="w-[960px] flex items-center justify-between px-4 py-2 mb-1 bg-[#0a1929]/60 rounded-t-lg border border-b-0 border-gray-800/50">
        <div className="flex items-center gap-3">
          <span className="text-blue-400 font-bold text-sm">
            {mode === "vs_computer" ? "YOU" : mode === "multiplayer_online" ? "YOU" : "P1"}
          </span>
          <div className="flex gap-0.5">
            {Array.from({ length: TOTAL_SHIP_CELLS }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-4 rounded-sm transition-colors duration-300 ${
                  i < score.p1Hits ? "bg-red-500" : "bg-gray-700"
                }`}
              />
            ))}
          </div>
          <span className="text-gray-500 text-xs">{score.p1Hits}/{TOTAL_SHIP_CELLS}</span>
        </div>

        <span className="text-gray-600 text-xs">HITS</span>

        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-xs">{score.p2Hits}/{TOTAL_SHIP_CELLS}</span>
          <div className="flex gap-0.5">
            {Array.from({ length: TOTAL_SHIP_CELLS }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-4 rounded-sm transition-colors duration-300 ${
                  i < score.p2Hits ? "bg-red-500" : "bg-gray-700"
                }`}
              />
            ))}
          </div>
          <span className="text-red-400 font-bold text-sm">
            {mode === "vs_computer" ? "CPU" : mode === "multiplayer_online" ? "OPP" : "P2"}
          </span>
        </div>
      </div>

      {/* Status Bar */}
      <div className={`w-[960px] px-6 py-2.5 border-b-0 border text-center font-semibold text-base relative ${statusBarClass}`}>
        {statusText}

        {mode === "multiplayer_online" && !gameOver && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Online
          </span>
        )}

        {sunkNotification && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-red-900/80 text-red-200 px-3 py-1 rounded text-sm font-bold animate-pulse">
            {sunkNotification}
          </div>
        )}
      </div>

      {/* Phaser Canvas */}
      <div className="rounded-b-xl overflow-hidden">
        <GameCanvas
          ref={canvasRef}
          key={gameKey}
          mode={mode}
          gameLogic={gameLogic}
          playerRole={playerRole}
          myPlayerIndex={myPlayerIndex}
          onStatusChange={handleStatusChange}
          onPlayerAttack={(mode === "multiplayer_online" || mode === "multiplayer_online_4p") ? handlePlayerAttack : undefined}
        />
      </div>

      {/* Bottom Controls */}
      <div className="w-[960px] mt-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-4 rounded bg-[#455a64]" />
            Ship
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-sm">🔥</span> Hit
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-sm">💧</span> Miss
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-4 rounded bg-[#0d3b66]" />
            Water
          </span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleBackToMenu}
            className="px-5 py-2 rounded-lg font-semibold text-sm bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-gray-200 transition-all cursor-pointer"
          >
            ← Menu
          </button>
          <button
            onClick={handleRestart}
            className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all shadow-lg cursor-pointer ${
              gameOver
                ? "bg-green-600 hover:bg-green-700 active:bg-green-800 text-white"
                : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white"
            }`}
          >
            {gameOver ? "⚓ Play Again" : "🔄 Restart"}
          </button>
        </div>
      </div>

      {/* Fleet Info */}
      <div className="mt-3 w-[960px] bg-[#0a1929]/40 rounded-lg border border-gray-800/40 px-5 py-2">
        <div className="flex items-center justify-center gap-4 text-gray-500 text-xs">
          {SHIP_TEMPLATES.map((t, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="flex gap-[1px]">
                {Array.from({ length: t.size }).map((_, j) => (
                  <span key={j} className="inline-block w-2.5 h-2.5 rounded-[2px] bg-gray-600" />
                ))}
              </span>
              {t.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BattleshipPage;
