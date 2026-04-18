package cmpe195.group1.minigameplatform.games.checkers.service;

import cmpe195.group1.minigameplatform.games.checkers.model.CheckersGameState;
import cmpe195.group1.minigameplatform.games.checkers.model.CheckersPiece;
import cmpe195.group1.minigameplatform.games.checkers.model.CheckersPosition;
import cmpe195.group1.minigameplatform.games.checkers.model.RoomParticipant;
import cmpe195.group1.minigameplatform.games.checkers.model.RoomState;
import cmpe195.group1.minigameplatform.games.checkers.payload.MovePayload;
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
public class CheckersRoomService implements SnapshotRoomService<RoomState> {

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

            CheckersGameState nextState = payload.getResultingState();
            if (nextState == null || nextState.getBoard() == null || nextState.getTurn() == null) {
                return null;
            }

            String expectedCurrentTurn = room.getGameState().getTurn();
            String expectedNextTurn = "white".equals(expectedCurrentTurn) ? "black" : "white";
            if (!Objects.equals(participant.getPieceColor(), expectedCurrentTurn)) {
                return null;
            }

            boolean multiJump = payload.getTo() != null && nextState.getSelected() != null
                && payload.getTo().getX() == nextState.getSelected().getX()
                && payload.getTo().getY() == nextState.getSelected().getY()
                && Objects.equals(nextState.getTurn(), expectedCurrentTurn);

            if (!multiJump && !Objects.equals(nextState.getTurn(), expectedNextTurn)) {
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

    private CheckersGameState createInitialState() {
        CheckersGameState state = new CheckersGameState();
        state.setBoard(createInitialBoard());
        state.setTurn("white");
        state.setSelected(null);
        return state;
    }

    private CheckersGameState copyState(CheckersGameState source) {
        CheckersGameState copy = new CheckersGameState();
        copy.setBoard(copyBoard(source.getBoard()));
        copy.setTurn(source.getTurn());
        if (source.getSelected() != null) {
            copy.setSelected(new CheckersPosition(source.getSelected().getX(), source.getSelected().getY()));
        }
        return copy;
    }

    private List<List<CheckersPiece>> createInitialBoard() {
        List<List<CheckersPiece>> board = new ArrayList<>();
        for (int y = 0; y < 8; y++) {
            List<CheckersPiece> row = new ArrayList<>();
            for (int x = 0; x < 8; x++) {
                if (y < 3 && (x + y) % 2 == 1) {
                    row.add(new CheckersPiece("black", false));
                } else if (y > 4 && (x + y) % 2 == 1) {
                    row.add(new CheckersPiece("white", false));
                } else {
                    row.add(null);
                }
            }
            board.add(row);
        }
        return board;
    }

    private List<List<CheckersPiece>> copyBoard(List<List<CheckersPiece>> board) {
        List<List<CheckersPiece>> copy = new ArrayList<>();
        for (List<CheckersPiece> row : board) {
            List<CheckersPiece> rowCopy = new ArrayList<>();
            for (CheckersPiece piece : row) {
                rowCopy.add(piece == null ? null : new CheckersPiece(piece.getColor(), piece.isKing()));
            }
            copy.add(rowCopy);
        }
        return copy;
    }

    private String determineWinner(CheckersGameState state) {
        int white = 0;
        int black = 0;
        for (List<CheckersPiece> row : state.getBoard()) {
            for (CheckersPiece piece : row) {
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
