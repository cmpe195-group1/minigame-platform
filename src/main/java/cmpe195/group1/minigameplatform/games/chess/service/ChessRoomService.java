package cmpe195.group1.minigameplatform.games.chess.service;

import cmpe195.group1.minigameplatform.games.chess.model.ChessGameState;
import cmpe195.group1.minigameplatform.games.chess.model.ChessPiece;
import cmpe195.group1.minigameplatform.games.chess.model.ChessPosition;
import cmpe195.group1.minigameplatform.games.chess.model.RoomParticipant;
import cmpe195.group1.minigameplatform.games.chess.model.RoomState;
import cmpe195.group1.minigameplatform.games.chess.payload.MovePayload;
import cmpe195.group1.minigameplatform.multiplayer.payload.CreateRoomRequest;
import cmpe195.group1.minigameplatform.multiplayer.payload.RoomScopedPayload;
import cmpe195.group1.minigameplatform.multiplayer.service.RoomActionResult;
import cmpe195.group1.minigameplatform.multiplayer.service.SnapshotRoomService;
import cmpe195.group1.minigameplatform.multiplayer.util.RoomCodeUtils;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ChessRoomService implements SnapshotRoomService<RoomState> {

    private static final String ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private final Random random = new Random();
    private final Map<String, RoomState> rooms = new ConcurrentHashMap<>();

    public RoomState getRoom(String roomCode) {
        if (roomCode == null) {
            return null;
        }
        return rooms.get(RoomCodeUtils.normalize(roomCode));
    }

    @Override
    public RoomState createRoom(String clientId, CreateRoomRequest payload) {
        String code;
        do {
            code = RoomCodeUtils.generate(random, ROOM_CHARS, 6);
        } while (rooms.containsKey(code));

        String hostName = payload != null ? payload.resolvePlayerName() : null;
        if (hostName == null || hostName.isBlank()) {
            hostName = "Player 1";
        }

        RoomState room = new RoomState();
        room.setRoomCode(code);
        room.setHostClientId(clientId);
        room.setParticipants(new ArrayList<>(List.of(
            new RoomParticipant(1, hostName, clientId, "white")
        )));
        room.setStatus("waiting");
        room.setGameState(null);
        room.setWinner(null);
        room.setMoveCount(0);
        rooms.put(code, room);
        return room;
    }

    @Override
    public RoomActionResult<RoomState> joinRoom(String clientId, RoomScopedPayload.JoinRoomRequest payload) {
        String code = payload != null && payload.resolveRoomCode() != null
            ? RoomCodeUtils.normalize(payload.resolveRoomCode())
            : "";

        RoomState room = rooms.get(code);
        if (room == null) {
            return RoomActionResult.error("Room not found. Check the code and try again.");
        }

        synchronized (room) {
            if (!"waiting".equals(room.getStatus())) {
                return RoomActionResult.error("Game already started. Cannot join now.");
            }
            if (room.getParticipants().size() >= 2) {
                return RoomActionResult.error("Room is full.");
            }

            for (RoomParticipant participant : room.getParticipants()) {
                if (Objects.equals(participant.getClientId(), clientId)) {
                    return RoomActionResult.ok(room);
                }
            }

            String playerName = payload != null ? payload.getPlayerName() : null;
            if (playerName == null || playerName.isBlank()) {
                playerName = "Player 2";
            }

            room.getParticipants().add(new RoomParticipant(2, playerName, clientId, "black"));
            return RoomActionResult.ok(room);
        }
    }

    public RoomState startGame(String clientId, String roomCode) {
        RoomState room = getRoom(roomCode);
        if (room == null) {
            return null;
        }

        synchronized (room) {
            if (!Objects.equals(room.getHostClientId(), clientId) || room.getParticipants().size() < 2) {
                return null;
            }

            room.setGameState(createInitialState());
            room.setStatus("playing");
            room.setWinner(null);
            room.setMoveCount(0);
            return room;
        }
    }

    public RoomState makeMove(String clientId, MovePayload payload) {
        if (payload == null) {
            return null;
        }

        RoomState room = getRoom(payload.getRoomCode());
        if (room == null) {
            return null;
        }

        synchronized (room) {
            if (!"playing".equals(room.getStatus()) || room.getGameState() == null) {
                return null;
            }

            RoomParticipant participant = room.getParticipants().stream()
                .filter(p -> Objects.equals(p.getClientId(), clientId))
                .findFirst()
                .orElse(null);
            if (participant == null) {
                return null;
            }

            ChessGameState nextState = payload.getResultingState();
            if (nextState == null || nextState.getBoard() == null || nextState.getTurn() == null) {
                return null;
            }

            String expectedCurrentTurn = room.getGameState().getTurn();
            String expectedNextTurn = "white".equals(expectedCurrentTurn) ? "black" : "white";
            if (!Objects.equals(participant.getPieceColor(), expectedCurrentTurn)) {
                return null;
            }

            if (!Objects.equals(nextState.getTurn(), expectedNextTurn)) {
                return null;
            }

            room.setGameState(copyState(nextState));
            room.setMoveCount(room.getMoveCount() + 1);

            String winner = determineWinner(room.getGameState());
            room.setWinner(winner);
            if (winner != null) {
                room.setStatus("finished");
            }

            return room;
        }
    }

    public RoomState reset(String clientId, String roomCode) {
        RoomState room = getRoom(roomCode);
        if (room == null) {
            return null;
        }

        synchronized (room) {
            if (!Objects.equals(room.getHostClientId(), clientId)) {
                return null;
            }

            room.setStatus("waiting");
            room.setGameState(null);
            room.setWinner(null);
            room.setMoveCount(0);
            return room;
        }
    }

    public RoomState disconnect(String clientId, String roomCode) {
        RoomState room = getRoom(roomCode);
        if (room == null) {
            return null;
        }

        synchronized (room) {
            room.getParticipants().removeIf(participant -> Objects.equals(participant.getClientId(), clientId));

            if (room.getParticipants().isEmpty()) {
                rooms.remove(room.getRoomCode());
                return null;
            }

            if (Objects.equals(room.getHostClientId(), clientId)) {
                room.setHostClientId(room.getParticipants().get(0).getClientId());
                room.getParticipants().get(0).setPieceColor("white");
                if (room.getParticipants().size() > 1) {
                    room.getParticipants().get(1).setPieceColor("black");
                }
            }

            if ("playing".equals(room.getStatus()) && room.getParticipants().size() < 2) {
                room.setStatus("finished");
                room.setWinner(room.getParticipants().get(0).getPieceColor());
            }

            return room;
        }
    }

    private ChessGameState createInitialState() {
        ChessGameState state = new ChessGameState();
        state.setBoard(createInitialBoard());
        state.setTurn("white");
        state.setSelected(null);
        return state;
    }

    private ChessGameState copyState(ChessGameState source) {
        ChessGameState copy = new ChessGameState();
        copy.setBoard(copyBoard(source.getBoard()));
        copy.setTurn(source.getTurn());
        if (source.getSelected() != null) {
            copy.setSelected(new ChessPosition(source.getSelected().getX(), source.getSelected().getY()));
        }
        return copy;
    }


    private List<List<ChessPiece>> createInitialBoard() {
        List<List<ChessPiece>> board = new ArrayList<>();
        String[] initialRow = {"rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"};

        for (int row = 0; row < 8; row++) {
            List<ChessPiece> newRow = new ArrayList<>();
            for (int col = 0; col < 8; col++) {
                switch (row) {
                    case 0:
                        newRow.add(new ChessPiece(initialRow[col], "black", false));
                        break;
                    case 1:
                        newRow.add(new ChessPiece("pawn", "black", false));
                        break;
                    case 6:
                        newRow.add(new ChessPiece("pawn", "white", false));
                        break;
                    case 7:
                        newRow.add(new ChessPiece(initialRow[col], "white", false));
                        break;
                    default:
                        newRow.add(null);
                        break;
                }
            }
            board.add(newRow);
        }

        return board;
    }

    private List<List<ChessPiece>> copyBoard(List<List<ChessPiece>> board) {
        List<List<ChessPiece>> copy = new ArrayList<>();
        for (List<ChessPiece> row : board) {
            List<ChessPiece> rowCopy = new ArrayList<>();
            for (ChessPiece piece : row) {
                rowCopy.add(
                    piece == null
                        ? null
                        : new ChessPiece(
                            piece.getType(),
                            piece.getColor(),
                            piece.isHasMoved()
                        )
                );
            }
            copy.add(rowCopy);
        }
        return copy;
    }

    //WIP -> Implement checkmates
    private String determineWinner(ChessGameState state) {
        int white = 0;
        int black = 0;
        for (List<ChessPiece> row : state.getBoard()) {
            for (ChessPiece piece : row) {
                if (piece == null) {
                    continue;
                }
                if ("white".equals(piece.getColor())) {
                    white++;
                } else if ("black".equals(piece.getColor())) {
                    black++;
                }
            }
        }

        if (white == 0) {
            return "black";
        }
        if (black == 0) {
            return "white";
        }
        return null;
    }

    @Override
    public String roomCodeOf(RoomState room) {
        return room != null ? room.getRoomCode() : null;
    }
}
