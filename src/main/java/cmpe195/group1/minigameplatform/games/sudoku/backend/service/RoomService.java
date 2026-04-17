package cmpe195.group1.minigameplatform.games.sudoku.backend.service;

import cmpe195.group1.minigameplatform.games.sudoku.backend.model.ColorProfile;
import cmpe195.group1.minigameplatform.games.sudoku.backend.model.PlayerScore;
import cmpe195.group1.minigameplatform.games.sudoku.backend.model.RoomParticipant;
import cmpe195.group1.minigameplatform.games.sudoku.backend.model.RoomState;
import cmpe195.group1.minigameplatform.games.sudoku.backend.model.SudokuCell;
import cmpe195.group1.minigameplatform.games.sudoku.backend.payload.MakeMovePayload;
import cmpe195.group1.minigameplatform.multiplayer.payload.CreateRoomRequest;
import cmpe195.group1.minigameplatform.multiplayer.payload.JoinRoomRequest;
import cmpe195.group1.minigameplatform.multiplayer.service.RoomActionResult;
import cmpe195.group1.minigameplatform.multiplayer.service.SnapshotRoomService;
import cmpe195.group1.minigameplatform.multiplayer.util.RoomCodeUtils;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RoomService implements SnapshotRoomService<RoomState> {

    private static final List<ColorProfile> COLORS = List.of(
        new ColorProfile("#3B82F6", "Blue"),
        new ColorProfile("#22C55E", "Green"),
        new ColorProfile("#F97316", "Orange"),
        new ColorProfile("#A855F7", "Purple")
    );

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

        int maxPlayers = payload != null && payload.getMaxPlayers() != null ? payload.getMaxPlayers() : 2;
        maxPlayers = Math.min(Math.max(2, maxPlayers), 4);

        String hostName = payload != null ? payload.resolvePlayerName() : null;
        if (hostName == null || hostName.isBlank()) {
            hostName = "Player 1";
        }

        RoomParticipant host = new RoomParticipant(
            1,
            hostName,
            COLORS.get(0).getColor(),
            COLORS.get(0).getColorName(),
            clientId
        );

        RoomState room = new RoomState();
        room.setRoomCode(code);
        room.setHostClientId(clientId);
        room.setMaxPlayers(maxPlayers);
        room.setParticipants(new ArrayList<>(List.of(host)));
        room.setStatus("waiting");
        room.setBoard(null);
        room.setPlayers(new ArrayList<>());
        room.setCurrentPlayerIndex(0);
        room.setPhase("setup");
        room.setWinner(null);
        room.setLastMoveCorrect(null);
        room.setMoveCount(0);

        rooms.put(code, room);
        return room;
    }

    @Override
    public RoomActionResult<RoomState> joinRoom(String clientId, JoinRoomRequest payload) {
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
            if (room.getParticipants().size() >= room.getMaxPlayers()) {
                return RoomActionResult.error("Room is full.");
            }

            Optional<RoomParticipant> already = room.getParticipants().stream()
                .filter(p -> Objects.equals(p.getClientId(), clientId))
                .findFirst();
            if (already.isPresent()) {
                return RoomActionResult.ok(room);
            }

            int seatIndex = room.getParticipants().size();
            String playerName = payload != null ? payload.getPlayerName() : null;
            if (playerName == null || playerName.isBlank()) {
                playerName = "Player " + (seatIndex + 1);
            }

            ColorProfile color = COLORS.get(Math.min(seatIndex, COLORS.size() - 1));
            room.getParticipants().add(new RoomParticipant(
                seatIndex + 1,
                playerName,
                color.getColor(),
                color.getColorName(),
                clientId
            ));

            return RoomActionResult.ok(room);
        }
    }

    public RoomState startGame(String clientId, String roomCode) {
        RoomState room = getRoom(roomCode);
        if (room == null) {
            return null;
        }

        synchronized (room) {
            if (!Objects.equals(room.getHostClientId(), clientId)) {
                return null;
            }
            if (room.getParticipants().size() < 2) {
                return null;
            }

            List<PlayerScore> players = new ArrayList<>();
            for (RoomParticipant participant : room.getParticipants()) {
                players.add(new PlayerScore(
                    participant.getPlayerId(),
                    participant.getName(),
                    participant.getColor(),
                    participant.getColorName(),
                    0
                ));
            }

            room.setPlayers(players);
            room.setBoard(generateSudokuBoard(36));
            room.setStatus("playing");
            room.setPhase("playing");
            room.setCurrentPlayerIndex(0);
            room.setWinner(null);
            room.setLastMoveCorrect(null);
            room.setMoveCount(0);
            return room;
        }
    }

    public RoomState makeMove(String clientId, MakeMovePayload payload) {
        if (payload == null) {
            return null;
        }

        RoomState room = getRoom(payload.getRoomCode());
        if (room == null) {
            return null;
        }

        synchronized (room) {
            if (!"playing".equals(room.getStatus()) || room.getBoard() == null) {
                return null;
            }
            if (room.getPlayers().isEmpty()) {
                return null;
            }

            if (room.getCurrentPlayerIndex() < 0 || room.getCurrentPlayerIndex() >= room.getPlayers().size()) {
                return null;
            }

            RoomParticipant participant = room.getParticipants().stream()
                .filter(p -> Objects.equals(p.getClientId(), clientId))
                .findFirst()
                .orElse(null);
            if (participant == null) {
                return null;
            }

            PlayerScore currentPlayer = room.getPlayers().get(room.getCurrentPlayerIndex());
            if (currentPlayer.getId() != participant.getPlayerId()) {
                return null;
            }

            int row = payload.getRow();
            int col = payload.getCol();
            int num = payload.getNum();

            if (row < 0 || row > 8 || col < 0 || col > 8) {
                return null;
            }

            SudokuCell cell = room.getBoard().get(row).get(col);
            if (cell.isGiven() || cell.getValue() != 0) {
                return null;
            }

            boolean correct = cell.getSolvedValue() == num;
            cell.setValue(num);
            cell.setPlayerId(participant.getPlayerId());
            cell.setIsCorrect(correct);

            if (correct) {
                for (PlayerScore player : room.getPlayers()) {
                    if (player.getId() == participant.getPlayerId()) {
                        player.setScore(player.getScore() + 1);
                        break;
                    }
                }
            }

            room.setLastMoveCorrect(correct);
            room.setMoveCount(room.getMoveCount() + 1);

            if (isBoardFull(room.getBoard())) {
                List<PlayerScore> sorted = new ArrayList<>(room.getPlayers());
                sorted.sort(Comparator.comparingInt(PlayerScore::getScore).reversed());
                room.setWinner(sorted.get(0));
                room.setPhase("finished");
                room.setStatus("finished");
            } else {
                room.setCurrentPlayerIndex((room.getCurrentPlayerIndex() + 1) % room.getPlayers().size());
            }

            return room;
        }
    }

    public RoomState newPuzzle(String clientId, String roomCode) {
        RoomState room = getRoom(roomCode);
        if (room == null) {
            return null;
        }

        synchronized (room) {
            if (!Objects.equals(room.getHostClientId(), clientId)) {
                return null;
            }

            room.setBoard(generateSudokuBoard(36));
            for (PlayerScore player : room.getPlayers()) {
                player.setScore(0);
            }
            room.setCurrentPlayerIndex(0);
            room.setPhase("playing");
            room.setStatus("playing");
            room.setWinner(null);
            room.setLastMoveCorrect(null);
            room.setMoveCount(0);
            return room;
        }
    }

    public RoomState restart(String clientId, String roomCode) {
        RoomState room = getRoom(roomCode);
        if (room == null) {
            return null;
        }

        synchronized (room) {
            if (!Objects.equals(room.getHostClientId(), clientId)) {
                return null;
            }

            room.setStatus("waiting");
            room.setPhase("setup");
            room.setBoard(null);
            room.setPlayers(new ArrayList<>());
            room.setCurrentPlayerIndex(0);
            room.setWinner(null);
            room.setLastMoveCorrect(null);
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
            room.getParticipants().removeIf(p -> Objects.equals(p.getClientId(), clientId));

            if (room.getParticipants().isEmpty()) {
                rooms.remove(room.getRoomCode());
                return null;
            }

            if (Objects.equals(room.getHostClientId(), clientId)) {
                room.setHostClientId(room.getParticipants().get(0).getClientId());
            }

            if ("playing".equals(room.getStatus()) && !room.getPlayers().isEmpty()) {
                List<Integer> activeParticipantIds = room.getParticipants().stream()
                    .map(RoomParticipant::getPlayerId)
                    .toList();

                room.setPlayers(new ArrayList<>(room.getPlayers().stream()
                    .filter(p -> activeParticipantIds.contains(p.getId()))
                    .toList()));

                if (room.getPlayers().isEmpty()) {
                    room.setStatus("waiting");
                    room.setPhase("setup");
                } else {
                    room.setCurrentPlayerIndex(room.getCurrentPlayerIndex() % room.getPlayers().size());
                }
            }

            if (room.getParticipants().size() == 1 && "playing".equals(room.getStatus())) {
                room.setStatus("finished");
                room.setPhase("finished");
                room.setWinner(room.getPlayers().isEmpty() ? null : room.getPlayers().get(0));
            }

            return room;
        }
    }

    private boolean isBoardFull(List<List<SudokuCell>> board) {
        for (List<SudokuCell> row : board) {
            for (SudokuCell cell : row) {
                if (cell.getValue() == 0) {
                    return false;
                }
            }
        }
        return true;
    }

    private List<List<SudokuCell>> generateSudokuBoard(int givenCount) {
        int[][] solved = new int[9][9];
        fillGrid(solved);

        int[][] puzzle = new int[9][9];
        for (int r = 0; r < 9; r++) {
            System.arraycopy(solved[r], 0, puzzle[r], 0, 9);
        }

        List<Integer> positions = new ArrayList<>();
        for (int i = 0; i < 81; i++) {
            positions.add(i);
        }
        Collections.shuffle(positions, random);

        int toRemove = 81 - givenCount;
        for (int pos : positions) {
            if (toRemove <= 0) {
                break;
            }
            int r = pos / 9;
            int c = pos % 9;
            if (puzzle[r][c] != 0) {
                puzzle[r][c] = 0;
                toRemove--;
            }
        }

        List<List<SudokuCell>> board = new ArrayList<>();
        for (int r = 0; r < 9; r++) {
            List<SudokuCell> row = new ArrayList<>();
            for (int c = 0; c < 9; c++) {
                int value = puzzle[r][c];
                row.add(new SudokuCell(
                    r,
                    c,
                    value,
                    value != 0,
                    null,
                    null,
                    solved[r][c]
                ));
            }
            board.add(row);
        }

        return board;
    }

    private boolean fillGrid(int[][] grid) {
        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                if (grid[r][c] == 0) {
                    List<Integer> nums = new ArrayList<>(Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9));
                    Collections.shuffle(nums, random);
                    for (int num : nums) {
                        if (isValid(grid, r, c, num)) {
                            grid[r][c] = num;
                            if (fillGrid(grid)) {
                                return true;
                            }
                            grid[r][c] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    private boolean isValid(int[][] grid, int row, int col, int num) {
        for (int i = 0; i < 9; i++) {
            if (grid[row][i] == num) {
                return false;
            }
            if (grid[i][col] == num) {
                return false;
            }
        }

        int br = (row / 3) * 3;
        int bc = (col / 3) * 3;
        for (int r = br; r < br + 3; r++) {
            for (int c = bc; c < bc + 3; c++) {
                if (grid[r][c] == num) {
                    return false;
                }
            }
        }

        return true;
    }

    @Override
    public String roomCodeOf(RoomState room) {
        return room != null ? room.getRoomCode() : null;
    }
}
