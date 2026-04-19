package cmpe195.group1.minigameplatform.games.sudoku.service;

import cmpe195.group1.minigameplatform.games.sudoku.model.PlayerScore;
import cmpe195.group1.minigameplatform.games.sudoku.model.RoomState;
import cmpe195.group1.minigameplatform.games.sudoku.model.SudokuCell;
import cmpe195.group1.minigameplatform.games.sudoku.payload.MakeMovePayload;
import cmpe195.group1.minigameplatform.multiplayer.payload.CreateRoomRequest;
import cmpe195.group1.minigameplatform.multiplayer.payload.RoomScopedPayload;
import cmpe195.group1.minigameplatform.multiplayer.service.RoomActionResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RoomServiceTest {

    private RoomService service;

    @BeforeEach
    void setUp() {
        service = new RoomService();
    }

    @Test
    void startGame_requiresHostAndSecondPlayerThenBuildsBoard() {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());

        assertThat(service.startGame("host-client", room.getRoomCode())).isNull();

        service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "Guest"));
        RoomState started = service.startGame("host-client", room.getRoomCode());

        assertThat(started).isSameAs(room);
        assertThat(started.getStatus()).isEqualTo("playing");
        assertThat(started.getPhase()).isEqualTo("playing");
        assertThat(started.getPlayers()).hasSize(2);
        assertThat(started.getBoard()).hasSize(9);
        assertThat(started.getBoard().get(0)).hasSize(9);
    }

    @Test
    void createRoom_getRoomAndRoomCodeOfHandleDefaultsAndClamps() {
        RoomState roomWithNullPayload = service.createRoom("host-client", null);

        assertThat(roomWithNullPayload.getMaxPlayers()).isEqualTo(2);
        assertThat(roomWithNullPayload.getParticipants()).singleElement().satisfies(participant -> {
            assertThat(participant.getName()).isEqualTo("Player 1");
            assertThat(participant.getColor()).isEqualTo("#3B82F6");
        });
        assertThat(service.getRoom(roomWithNullPayload.getRoomCode().toLowerCase())).isSameAs(roomWithNullPayload);
        assertThat(service.getRoom(null)).isNull();
        assertThat(service.roomCodeOf(roomWithNullPayload)).isEqualTo(roomWithNullPayload.getRoomCode());
        assertThat(service.roomCodeOf(null)).isNull();

        CreateRoomRequest payload = new CreateRoomRequest();
        payload.setPlayerName("   ");
        payload.setMaxPlayers(9);

        RoomState clampedRoom = service.createRoom("host-2", payload);

        assertThat(clampedRoom.getMaxPlayers()).isEqualTo(4);
        assertThat(clampedRoom.getParticipants()).singleElement().extracting(cmpe195.group1.minigameplatform.games.sudoku.model.RoomParticipant::getName)
            .isEqualTo("Player 1");
    }

    @Test
    void createRoom_preservesProvidedHostNameAndMinimumPlayerBound() {
        CreateRoomRequest payload = new CreateRoomRequest();
        payload.setPlayerName("Host Player");
        payload.setMaxPlayers(1);

        RoomState room = service.createRoom("host-client", payload);

        assertThat(room.getMaxPlayers()).isEqualTo(2);
        assertThat(room.getParticipants()).singleElement().extracting(cmpe195.group1.minigameplatform.games.sudoku.model.RoomParticipant::getName)
            .isEqualTo("Host Player");
    }

    @Test
    void joinRoom_handlesMissingStartedFullDuplicateAndDefaultSeatName() {
        assertThat(service.joinRoom("ghost", joinRequest("missing", "Ghost")).getError())
            .isEqualTo("Room not found. Check the code and try again.");

        CreateRoomRequest createRoomRequest = new CreateRoomRequest();
        createRoomRequest.setMaxPlayers(2);
        RoomState room = service.createRoom("host-client", createRoomRequest);

        RoomActionResult<RoomState> joined = service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "   "));

        assertThat(joined.isOk()).isTrue();
        assertThat(room.getParticipants()).hasSize(2);
        assertThat(room.getParticipants().get(1).getName()).isEqualTo("Player 2");
        assertThat(room.getParticipants().get(1).getColorName()).isEqualTo("Green");
        assertThat(service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "Again")).getError()).isEqualTo("Room is full.");
        assertThat(service.joinRoom("extra-client", joinRequest(room.getRoomCode(), "Extra")).getError()).isEqualTo("Room is full.");

        room.setStatus("playing");

        assertThat(service.joinRoom("late-client", joinRequest(room.getRoomCode(), "Late")).getError())
            .isEqualTo("Game already started. Cannot join now.");
    }

    @Test
    void joinRoom_returnsExistingRoomForSameClientBeforeRoomIsFullAndRejectsMissingCodePayload() {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());

        RoomActionResult<RoomState> existingHost = service.joinRoom("host-client", joinRequest(room.getRoomCode(), "Host Again"));
        RoomActionResult<RoomState> nullPayload = service.joinRoom("guest-client", null);
        RoomActionResult<RoomState> missingCode = service.joinRoom("guest-client", new RoomScopedPayload.JoinRoomRequest());

        assertThat(existingHost.isOk()).isTrue();
        assertThat(existingHost.getRoom()).isSameAs(room);
        assertThat(room.getParticipants()).singleElement();
        assertThat(nullPayload.getError()).isEqualTo("Room not found. Check the code and try again.");
        assertThat(missingCode.getError()).isEqualTo("Room not found. Check the code and try again.");
    }

    @Test
    void joinRoom_acceptsNullPayloadWhenRoomIsRegisteredUnderEmptyCode() throws Exception {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());
        registerRoomUnderCode(room, "");

        RoomActionResult<RoomState> result = service.joinRoom("guest-client", null);

        assertThat(result.isOk()).isTrue();
        assertThat(result.getRoom()).isSameAs(room);
        assertThat(room.getParticipants()).hasSize(2);
        assertThat(room.getParticipants().get(1).getName()).isEqualTo("Player 2");
    }

    @Test
    void startGame_requiresKnownRoomHostAndEnoughPlayers() {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());

        assertThat(service.startGame("host-client", "missing")).isNull();
        assertThat(service.startGame("guest-client", room.getRoomCode())).isNull();
        assertThat(service.startGame("host-client", room.getRoomCode())).isNull();

        service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "Guest"));

        assertThat(service.startGame("host-client", room.getRoomCode())).isSameAs(room);
    }

    @Test
    void makeMove_rejectsOutOfTurnPlayer() {
        RoomState room = playableRoom();
        room.setCurrentPlayerIndex(1);

        RoomState updated = service.makeMove("host-client", move(room.getRoomCode(), 0, 0, 5));

        assertThat(updated).isNull();
    }

    @Test
    void makeMove_rejectsInvalidPayloadStateAndCellConditions() {
        RoomState room = playableRoom();
        room.setPlayers(new ArrayList<>(List.of(
            new PlayerScore(1, "Host", "#3B82F6", "Blue", 0),
            new PlayerScore(2, "Guest", "#22C55E", "Green", 0)
        )));
        room.setBoard(boardWithOpenCells(2));

        assertThat(service.makeMove("host-client", null)).isNull();
        assertThat(service.makeMove("host-client", move("missing", 0, 0, 5))).isNull();

        room.setStatus("waiting");
        assertThat(service.makeMove("host-client", move(room.getRoomCode(), 0, 0, 5))).isNull();

        room.setStatus("playing");
        room.setBoard(null);
        assertThat(service.makeMove("host-client", move(room.getRoomCode(), 0, 0, 5))).isNull();

        room.setBoard(boardWithOpenCells(2));
        room.setPlayers(new ArrayList<>());
        assertThat(service.makeMove("host-client", move(room.getRoomCode(), 0, 0, 5))).isNull();

        room.setPlayers(new ArrayList<>(List.of(
            new PlayerScore(1, "Host", "#3B82F6", "Blue", 0),
            new PlayerScore(2, "Guest", "#22C55E", "Green", 0)
        )));
        room.setCurrentPlayerIndex(-1);
        assertThat(service.makeMove("host-client", move(room.getRoomCode(), 0, 0, 5))).isNull();

        room.setCurrentPlayerIndex(room.getPlayers().size());
        assertThat(service.makeMove("host-client", move(room.getRoomCode(), 0, 0, 5))).isNull();

        room.setCurrentPlayerIndex(0);
        assertThat(service.makeMove("outsider", move(room.getRoomCode(), 0, 0, 5))).isNull();

        room.setCurrentPlayerIndex(1);
        assertThat(service.makeMove("host-client", move(room.getRoomCode(), 0, 0, 5))).isNull();

        room.setCurrentPlayerIndex(0);
        assertThat(service.makeMove("host-client", move(room.getRoomCode(), -1, 0, 5))).isNull();
        assertThat(service.makeMove("host-client", move(room.getRoomCode(), 0, 9, 5))).isNull();

        room.setBoard(boardWithGivenCell(0, 0, 9));
        assertThat(service.makeMove("host-client", move(room.getRoomCode(), 0, 0, 9))).isNull();

        room.setBoard(boardWithFilledEditableCell(0, 0, 7));
        assertThat(service.makeMove("host-client", move(room.getRoomCode(), 0, 0, 7))).isNull();
    }

    @Test
    void makeMove_recordsIncorrectMoveAndStillAdvancesTurn() {
        RoomState room = playableRoom();
        room.setBoard(boardWithOpenCells(2));
        room.setPlayers(new ArrayList<>(List.of(
            new PlayerScore(1, "Host", "#3B82F6", "Blue", 2),
            new PlayerScore(2, "Guest", "#22C55E", "Green", 1)
        )));
        room.setCurrentPlayerIndex(0);

        RoomState updated = service.makeMove("host-client", move(room.getRoomCode(), 0, 0, 4));

        assertThat(updated).isSameAs(room);
        assertThat(updated.getLastMoveCorrect()).isFalse();
        assertThat(updated.getPlayers().get(0).getScore()).isEqualTo(2);
        assertThat(updated.getCurrentPlayerIndex()).isEqualTo(1);
        assertThat(updated.getBoard().get(0).get(0).getPlayerId()).isEqualTo(1);
        assertThat(updated.getBoard().get(0).get(0).getIsCorrect()).isFalse();
    }

    @Test
    void makeMove_scoresSecondPlayerWhenTurnBelongsToGuest() {
        RoomState room = playableRoom();
        room.setBoard(boardWithOpenCells(2));
        room.setPlayers(new ArrayList<>(List.of(
            new PlayerScore(1, "Host", "#3B82F6", "Blue", 0),
            new PlayerScore(2, "Guest", "#22C55E", "Green", 0)
        )));
        room.setCurrentPlayerIndex(1);

        RoomState updated = service.makeMove("guest-client", move(room.getRoomCode(), 0, 0, 5));

        assertThat(updated).isSameAs(room);
        assertThat(updated.getPlayers().get(1).getScore()).isEqualTo(1);
        assertThat(updated.getBoard().get(0).get(0).getPlayerId()).isEqualTo(2);
    }

    @Test
    void makeMove_scoresCorrectMoveAndAdvancesTurn() {
        RoomState room = playableRoom();
        room.setBoard(boardWithOpenCells(2));
        room.setPlayers(new ArrayList<>(List.of(
            new PlayerScore(1, "Host", "#3B82F6", "Blue", 0),
            new PlayerScore(2, "Guest", "#22C55E", "Green", 0)
        )));
        room.setCurrentPlayerIndex(0);

        RoomState updated = service.makeMove("host-client", move(room.getRoomCode(), 0, 0, 5));

        assertThat(updated).isSameAs(room);
        assertThat(updated.getBoard().get(0).get(0).getValue()).isEqualTo(5);
        assertThat(updated.getBoard().get(0).get(0).getPlayerId()).isEqualTo(1);
        assertThat(updated.getLastMoveCorrect()).isTrue();
        assertThat(updated.getPlayers().get(0).getScore()).isEqualTo(1);
        assertThat(updated.getCurrentPlayerIndex()).isEqualTo(1);
        assertThat(updated.getStatus()).isEqualTo("playing");
    }

    @Test
    void makeMove_finishesBoardAndSelectsWinner() {
        RoomState room = playableRoom();
        room.setBoard(boardWithOpenCells(1));
        room.setPlayers(new ArrayList<>(List.of(
            new PlayerScore(1, "Host", "#3B82F6", "Blue", 3),
            new PlayerScore(2, "Guest", "#22C55E", "Green", 1)
        )));
        room.setCurrentPlayerIndex(0);

        RoomState updated = service.makeMove("host-client", move(room.getRoomCode(), 0, 0, 5));

        assertThat(updated).isSameAs(room);
        assertThat(updated.getStatus()).isEqualTo("finished");
        assertThat(updated.getPhase()).isEqualTo("finished");
        assertThat(updated.getWinner()).isNotNull();
        assertThat(updated.getWinner().getId()).isEqualTo(1);
        assertThat(updated.getWinner().getScore()).isEqualTo(4);
    }

    @Test
    void newPuzzle_resetsScoresAndStateForHost() {
        RoomState room = playableRoom();
        room.setPlayers(new ArrayList<>(List.of(
            new PlayerScore(1, "Host", "#3B82F6", "Blue", 5),
            new PlayerScore(2, "Guest", "#22C55E", "Green", 2)
        )));
        room.setWinner(new PlayerScore(2, "Guest", "#22C55E", "Green", 2));
        room.setLastMoveCorrect(Boolean.FALSE);
        room.setMoveCount(9);

        RoomState updated = service.newPuzzle("host-client", room.getRoomCode());

        assertThat(updated).isSameAs(room);
        assertThat(updated.getBoard()).hasSize(9);
        assertThat(updated.getPlayers()).extracting(PlayerScore::getScore).containsExactly(0, 0);
        assertThat(updated.getCurrentPlayerIndex()).isZero();
        assertThat(updated.getPhase()).isEqualTo("playing");
        assertThat(updated.getStatus()).isEqualTo("playing");
        assertThat(updated.getWinner()).isNull();
        assertThat(updated.getLastMoveCorrect()).isNull();
        assertThat(updated.getMoveCount()).isZero();
    }

    @Test
    void newPuzzle_requiresExistingRoomAndHost() {
        RoomState room = playableRoom();

        assertThat(service.newPuzzle("host-client", "missing")).isNull();
        assertThat(service.newPuzzle("guest-client", room.getRoomCode())).isNull();
    }

    @Test
    void restart_resetsRoomToSetup() {
        RoomState room = playableRoom();
        room.setBoard(boardWithOpenCells(2));
        room.setPlayers(new ArrayList<>(List.of(new PlayerScore(1, "Host", "#3B82F6", "Blue", 1))));
        room.setWinner(new PlayerScore(1, "Host", "#3B82F6", "Blue", 1));
        room.setMoveCount(2);

        RoomState updated = service.restart("host-client", room.getRoomCode());

        assertThat(updated).isSameAs(room);
        assertThat(updated.getStatus()).isEqualTo("waiting");
        assertThat(updated.getPhase()).isEqualTo("setup");
        assertThat(updated.getBoard()).isNull();
        assertThat(updated.getPlayers()).isEmpty();
        assertThat(updated.getWinner()).isNull();
        assertThat(updated.getMoveCount()).isZero();
    }

    @Test
    void restart_requiresExistingRoomAndHost() {
        RoomState room = playableRoom();

        assertThat(service.restart("host-client", "missing")).isNull();
        assertThat(service.restart("guest-client", room.getRoomCode())).isNull();
    }

    @Test
    void disconnect_finishesGameWhenOneParticipantRemains() {
        RoomState room = playableRoom();
        room.setStatus("playing");
        room.setPhase("playing");
        room.setPlayers(new ArrayList<>(List.of(
            new PlayerScore(1, "Host", "#3B82F6", "Blue", 1),
            new PlayerScore(2, "Guest", "#22C55E", "Green", 3)
        )));

        RoomState updated = service.disconnect("guest-client", room.getRoomCode());

        assertThat(updated).isSameAs(room);
        assertThat(updated.getParticipants()).singleElement().extracting(cmpe195.group1.minigameplatform.games.sudoku.model.RoomParticipant::getClientId).isEqualTo("host-client");
        assertThat(updated.getPlayers()).singleElement().extracting(PlayerScore::getId).isEqualTo(1);
        assertThat(updated.getStatus()).isEqualTo("finished");
        assertThat(updated.getPhase()).isEqualTo("finished");
        assertThat(updated.getWinner()).isNotNull();
        assertThat(updated.getWinner().getId()).isEqualTo(1);
    }

    @Test
    void disconnect_handlesMissingRoomEmptyRoomHostReassignmentAndSetupFallback() {
        assertThat(service.disconnect("ghost", "missing")).isNull();

        RoomState soloRoom = service.createRoom("solo-host", new CreateRoomRequest());

        assertThat(service.disconnect("solo-host", soloRoom.getRoomCode())).isNull();
        assertThat(service.getRoom(soloRoom.getRoomCode())).isNull();

        RoomState room = playableRoom();
        room.setCurrentPlayerIndex(5);
        room.setPlayers(new ArrayList<>(List.of(
            new PlayerScore(1, "Host", "#3B82F6", "Blue", 3),
            new PlayerScore(2, "Guest", "#22C55E", "Green", 4)
        )));

        RoomState hostLeft = service.disconnect("host-client", room.getRoomCode());

        assertThat(hostLeft).isSameAs(room);
        assertThat(hostLeft.getHostClientId()).isEqualTo("guest-client");
        assertThat(hostLeft.getPlayers()).singleElement().extracting(PlayerScore::getId).isEqualTo(2);
        assertThat(hostLeft.getCurrentPlayerIndex()).isZero();
        assertThat(hostLeft.getStatus()).isEqualTo("finished");

        RoomState setupFallback = playableRoom();
        setupFallback.setPlayers(new ArrayList<>(List.of(new PlayerScore(99, "Ghost", "#000", "Ghost", 0))));

        RoomState updated = service.disconnect("guest-client", setupFallback.getRoomCode());

        assertThat(updated).isSameAs(setupFallback);
        assertThat(updated.getPlayers()).isEmpty();
        assertThat(updated.getStatus()).isEqualTo("waiting");
        assertThat(updated.getPhase()).isEqualTo("setup");
    }

    @Test
    void disconnect_leavesWaitingRoomWithoutFinishingGame() {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());
        service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "Guest"));

        RoomState updated = service.disconnect("guest-client", room.getRoomCode());

        assertThat(updated).isSameAs(room);
        assertThat(updated.getParticipants()).singleElement().extracting(cmpe195.group1.minigameplatform.games.sudoku.model.RoomParticipant::getClientId)
            .isEqualTo("host-client");
        assertThat(updated.getStatus()).isEqualTo("waiting");
        assertThat(updated.getPhase()).isEqualTo("setup");
    }

    @Test
    void disconnect_reassignsHostInWaitingRoom() {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());
        service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "Guest"));

        RoomState updated = service.disconnect("host-client", room.getRoomCode());

        assertThat(updated).isSameAs(room);
        assertThat(updated.getHostClientId()).isEqualTo("guest-client");
        assertThat(updated.getParticipants()).singleElement().extracting(cmpe195.group1.minigameplatform.games.sudoku.model.RoomParticipant::getClientId)
            .isEqualTo("guest-client");
        assertThat(updated.getStatus()).isEqualTo("waiting");
        assertThat(updated.getPhase()).isEqualTo("setup");
    }

    @Test
    void disconnect_finishesPlayingRoomWithNullWinnerWhenNoTrackedScoresRemain() {
        RoomState room = playableRoom();
        room.setPlayers(new ArrayList<>());

        RoomState updated = service.disconnect("guest-client", room.getRoomCode());

        assertThat(updated).isSameAs(room);
        assertThat(updated.getParticipants()).singleElement().extracting(cmpe195.group1.minigameplatform.games.sudoku.model.RoomParticipant::getClientId)
            .isEqualTo("host-client");
        assertThat(updated.getStatus()).isEqualTo("finished");
        assertThat(updated.getPhase()).isEqualTo("finished");
        assertThat(updated.getWinner()).isNull();
    }

    private RoomState playableRoom() {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());
        service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "Guest"));
        room.setStatus("playing");
        room.setPhase("playing");
        return room;
    }

    private RoomScopedPayload.JoinRoomRequest joinRequest(String roomCode, String playerName) {
        RoomScopedPayload.JoinRoomRequest request = new RoomScopedPayload.JoinRoomRequest();
        request.setRoomCode(roomCode);
        request.setPlayerName(playerName);
        return request;
    }

    private MakeMovePayload move(String roomCode, int row, int col, int num) {
        MakeMovePayload payload = new MakeMovePayload();
        payload.setRoomCode(roomCode);
        payload.setRow(row);
        payload.setCol(col);
        payload.setNum(num);
        return payload;
    }

    private List<List<SudokuCell>> boardWithOpenCells(int openCellCount) {
        List<List<SudokuCell>> board = new ArrayList<>();
        int remaining = openCellCount;
        for (int row = 0; row < 9; row++) {
            List<SudokuCell> currentRow = new ArrayList<>();
            for (int col = 0; col < 9; col++) {
                boolean open = remaining > 0;
                currentRow.add(new SudokuCell(row, col, open ? 0 : 1, !open, null, null, open ? 5 : 1));
                if (open) {
                    remaining--;
                }
            }
            board.add(currentRow);
        }
        return board;
    }

    private List<List<SudokuCell>> boardWithGivenCell(int rowIndex, int colIndex, int solvedValue) {
        List<List<SudokuCell>> board = boardWithOpenCells(1);
        board.get(rowIndex).set(colIndex, new SudokuCell(rowIndex, colIndex, solvedValue, true, null, null, solvedValue));
        return board;
    }

    private List<List<SudokuCell>> boardWithFilledEditableCell(int rowIndex, int colIndex, int solvedValue) {
        List<List<SudokuCell>> board = boardWithOpenCells(1);
        board.get(rowIndex).set(colIndex, new SudokuCell(rowIndex, colIndex, solvedValue, false, 1, Boolean.TRUE, solvedValue));
        return board;
    }

    @SuppressWarnings("unchecked")
    private void registerRoomUnderCode(RoomState room, String roomCode) throws Exception {
        room.setRoomCode(roomCode);
        Field roomsField = RoomService.class.getDeclaredField("rooms");
        roomsField.setAccessible(true);
        Map<String, RoomState> rooms = (Map<String, RoomState>) roomsField.get(service);
        rooms.put(roomCode, room);
    }
}

