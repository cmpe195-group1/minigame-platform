package cmpe195.group1.minigameplatform.games.checkers.service;

import cmpe195.group1.minigameplatform.games.checkers.model.CheckersGameState;
import cmpe195.group1.minigameplatform.games.checkers.model.CheckersPiece;
import cmpe195.group1.minigameplatform.games.checkers.model.CheckersPosition;
import cmpe195.group1.minigameplatform.games.checkers.model.RoomState;
import cmpe195.group1.minigameplatform.games.checkers.payload.MovePayload;
import cmpe195.group1.minigameplatform.multiplayer.payload.CreateRoomRequest;
import cmpe195.group1.minigameplatform.multiplayer.payload.RoomScopedPayload;
import cmpe195.group1.minigameplatform.multiplayer.service.RoomActionResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;

import static org.assertj.core.api.Assertions.assertThat;

class CheckersRoomServiceTest {

    private CheckersRoomService service;

    @BeforeEach
    void setUp() {
        service = new CheckersRoomService();
    }

    @Test
    void startGame_initializesBoardForHostWithTwoPlayers() {
        RoomState room = waitingRoom();

        RoomState started = service.startGame("host-client", room.getRoomCode());

        assertThat(started).isSameAs(room);
        assertThat(started.getStatus()).isEqualTo("playing");
        assertThat(started.getGameState()).isNotNull();
        assertThat(started.getGameState().getTurn()).isEqualTo("white");
        assertThat(started.getGameState().getBoard()).hasSize(8);
    }

    @Test
    void createRoom_getRoomAndRoomCodeOfHandleDefaultsAndNulls() {
        RoomState createdWithNullPayload = service.createRoom("host-client", null);

        assertThat(createdWithNullPayload.getParticipants()).singleElement().satisfies(participant -> {
            assertThat(participant.getName()).isEqualTo("Player 1");
            assertThat(participant.getPieceColor()).isEqualTo("white");
        });
        assertThat(service.getRoom(createdWithNullPayload.getRoomCode().toLowerCase())).isSameAs(createdWithNullPayload);

        CreateRoomRequest blankNamePayload = new CreateRoomRequest();
        blankNamePayload.setPlayerName("   ");
        RoomState createdWithBlankName = service.createRoom("host-blank", blankNamePayload);

        assertThat(createdWithBlankName.getParticipants()).singleElement().extracting(cmpe195.group1.minigameplatform.games.checkers.model.RoomParticipant::getName)
            .isEqualTo("Player 1");
        assertThat(service.getRoom(null)).isNull();
        assertThat(service.roomCodeOf(createdWithBlankName)).isEqualTo(createdWithBlankName.getRoomCode());
        assertThat(service.roomCodeOf(null)).isNull();
    }

    @Test
    void createRoom_preservesProvidedHostName() {
        CreateRoomRequest namedPayload = new CreateRoomRequest();
        namedPayload.setPlayerName("Host Player");

        RoomState room = service.createRoom("host-client", namedPayload);

        assertThat(room.getParticipants()).singleElement().extracting(cmpe195.group1.minigameplatform.games.checkers.model.RoomParticipant::getName)
            .isEqualTo("Host Player");
    }

    @Test
    void createRoom_retriesOnCodeCollisionAndFallsBackWhenResolvedNameIsBlank() throws Exception {
        setRandom(sequenceRandom(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1));
        registerRoomUnderCode(new RoomState(), "AAAAAA");

        CreateRoomRequest payload = new CreateRoomRequest() {
            @Override
            public String resolvePlayerName() {
                return "   ";
            }
        };

        RoomState room = service.createRoom("host-client", payload);

        assertThat(room.getRoomCode()).isEqualTo("AAAAAB");
        assertThat(room.getParticipants()).singleElement().extracting(cmpe195.group1.minigameplatform.games.checkers.model.RoomParticipant::getName)
            .isEqualTo("Player 1");
    }

    @Test
    void joinRoom_handlesMissingStartedFullDuplicateAndDefaultNameBranches() {
        RoomScopedPayload.JoinRoomRequest missingRequest = new RoomScopedPayload.JoinRoomRequest();
        missingRequest.setRoomCode("missing");

        assertThat(service.joinRoom("ghost", missingRequest).getError()).isEqualTo("Room not found. Check the code and try again.");

        RoomState room = service.createRoom("host-client", new CreateRoomRequest());
        RoomScopedPayload.JoinRoomRequest blankNameJoin = new RoomScopedPayload.JoinRoomRequest();
        blankNameJoin.setRoomCode(room.getRoomCode());
        blankNameJoin.setPlayerName("   ");

        RoomActionResult<RoomState> joinResult = service.joinRoom("guest-client", blankNameJoin);

        assertThat(joinResult.isOk()).isTrue();
        assertThat(room.getParticipants()).hasSize(2);
        assertThat(room.getParticipants().get(1).getName()).isEqualTo("Player 2");
        assertThat(service.joinRoom("guest-client", blankNameJoin).getError()).isEqualTo("Room is full.");
        assertThat(service.joinRoom("extra-client", blankNameJoin).getError()).isEqualTo("Room is full.");

        RoomState started = service.startGame("host-client", room.getRoomCode());

        assertThat(started).isSameAs(room);
        assertThat(service.joinRoom("late-client", blankNameJoin).getError()).isEqualTo("Game already started. Cannot join now.");
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
    void startGame_requiresExistingRoomHostAndEnoughPlayers() {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());

        assertThat(service.startGame("host-client", "missing")).isNull();
        assertThat(service.startGame("guest-client", room.getRoomCode())).isNull();
        assertThat(service.startGame("host-client", room.getRoomCode())).isNull();

        service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "Guest"));

        assertThat(service.startGame("host-client", room.getRoomCode())).isSameAs(room);
    }

    @Test
    void makeMove_rejectsMoveFromWrongPlayerTurn() {
        RoomState room = startedRoom();

        MovePayload payload = new MovePayload();
        payload.setRoomCode(room.getRoomCode());
        payload.setFrom(new CheckersPosition(0, 5));
        payload.setTo(new CheckersPosition(1, 4));
        payload.setResultingState(nextState("black", null, boardWithPieces(1, 1)));

        RoomState updated = service.makeMove("guest-client", payload);

        assertThat(updated).isNull();
    }

    @Test
    void makeMove_rejectsInvalidPayloadStateAndTurnTransitions() {
        RoomState room = startedRoom();

        assertThat(service.makeMove("host-client", null)).isNull();

        MovePayload missingRoomPayload = new MovePayload();
        missingRoomPayload.setRoomCode("missing");
        assertThat(service.makeMove("host-client", missingRoomPayload)).isNull();

        room.setStatus("waiting");
        assertThat(service.makeMove("host-client", move(room.getRoomCode(), nextState("black", null, boardWithPieces(1, 1))))).isNull();

        room.setStatus("playing");
        room.setGameState(null);
        assertThat(service.makeMove("host-client", move(room.getRoomCode(), nextState("black", null, boardWithPieces(1, 1))))).isNull();

        room.setGameState(nextState("white", null, boardWithPieces(1, 1)));
        assertThat(service.makeMove("outsider", move(room.getRoomCode(), nextState("black", null, boardWithPieces(1, 1))))).isNull();
        assertThat(service.makeMove("host-client", move(room.getRoomCode(), null))).isNull();
        assertThat(service.makeMove("host-client", move(room.getRoomCode(), new CheckersGameState()))).isNull();
        assertThat(service.makeMove("host-client", move(room.getRoomCode(), nextState("white", null, boardWithPieces(1, 1))))).isNull();

        CheckersGameState missingBoard = new CheckersGameState();
        missingBoard.setTurn("black");
        assertThat(service.makeMove("host-client", move(room.getRoomCode(), missingBoard))).isNull();

        CheckersGameState missingTurn = new CheckersGameState();
        missingTurn.setBoard(boardWithPieces(1, 1));
        assertThat(service.makeMove("host-client", move(room.getRoomCode(), missingTurn))).isNull();
    }

    @Test
    void makeMove_acceptsMultiJumpStateWithoutTurnChange() {
        RoomState room = startedRoom();
        room.setGameState(nextState("white", null, boardWithPieces(1, 1)));

        CheckersPosition landing = new CheckersPosition(4, 3);
        MovePayload payload = new MovePayload();
        payload.setRoomCode(room.getRoomCode());
        payload.setFrom(new CheckersPosition(2, 5));
        payload.setTo(landing);
        payload.setResultingState(nextState("white", landing, boardWithPieces(1, 1)));

        RoomState updated = service.makeMove("host-client", payload);

        assertThat(updated).isSameAs(room);
        assertThat(updated.getMoveCount()).isEqualTo(1);
        assertThat(updated.getStatus()).isEqualTo("playing");
        assertThat(updated.getWinner()).isNull();
        assertThat(updated.getGameState().getTurn()).isEqualTo("white");
        assertThat(updated.getGameState().getSelected()).isNotNull();
    }

    @Test
    void makeMove_handlesNonMultiJumpFallbackBranchesAndUnknownPieceColors() {
        RoomState room = startedRoom();
        room.setGameState(nextState("white", null, boardWithPieces(1, 1)));

        MovePayload xMismatch = move(room.getRoomCode(), nextState("black", new CheckersPosition(3, 4), boardWithPieces(1, 1)));
        xMismatch.setTo(new CheckersPosition(4, 4));

        RoomState xMismatchUpdated = service.makeMove("host-client", xMismatch);

        assertThat(xMismatchUpdated).isSameAs(room);
        assertThat(xMismatchUpdated.getGameState().getTurn()).isEqualTo("black");

        room.setGameState(nextState("white", null, boardWithPieces(1, 1)));
        MovePayload yMismatch = move(room.getRoomCode(), nextState("black", new CheckersPosition(4, 3), boardWithPieces(1, 1)));
        yMismatch.setTo(new CheckersPosition(4, 4));

        RoomState yMismatchUpdated = service.makeMove("host-client", yMismatch);

        assertThat(yMismatchUpdated).isSameAs(room);
        assertThat(yMismatchUpdated.getGameState().getSelected().getY()).isEqualTo(3);

        room.setGameState(nextState("white", null, boardWithPieces(1, 1)));
        List<List<CheckersPiece>> boardWithUnknownColor = boardWithPieces(1, 1);
        boardWithUnknownColor.get(3).set(3, new CheckersPiece("green", false));
        MovePayload turnMismatch = move(room.getRoomCode(), nextState("black", new CheckersPosition(1, 4), boardWithUnknownColor));
        turnMismatch.setTo(new CheckersPosition(1, 4));

        RoomState turnMismatchUpdated = service.makeMove("host-client", turnMismatch);

        assertThat(turnMismatchUpdated).isSameAs(room);
        assertThat(turnMismatchUpdated.getStatus()).isEqualTo("playing");
        assertThat(turnMismatchUpdated.getWinner()).isNull();
        assertThat(turnMismatchUpdated.getGameState().getBoard().get(3).get(3)).isNotNull();
        assertThat(turnMismatchUpdated.getGameState().getBoard().get(3).get(3).getColor()).isEqualTo("green");
    }

    @Test
    void makeMove_marksWinnerWhenOpponentHasNoPieces() {
        RoomState room = startedRoom();
        room.setGameState(nextState("white", null, boardWithPieces(1, 1)));

        MovePayload payload = new MovePayload();
        payload.setRoomCode(room.getRoomCode());
        payload.setFrom(new CheckersPosition(0, 5));
        payload.setTo(new CheckersPosition(1, 4));
        payload.setResultingState(nextState("black", null, boardWithPieces(1, 0)));

        RoomState updated = service.makeMove("host-client", payload);

        assertThat(updated).isSameAs(room);
        assertThat(updated.getWinner()).isEqualTo("white");
        assertThat(updated.getStatus()).isEqualTo("finished");
    }

    @Test
    void makeMove_marksBlackWinnerWhenWhiteHasNoPieces() {
        RoomState room = startedRoom();
        room.setGameState(nextState("black", null, boardWithPieces(1, 1)));

        MovePayload payload = new MovePayload();
        payload.setRoomCode(room.getRoomCode());
        payload.setFrom(new CheckersPosition(0, 2));
        payload.setTo(new CheckersPosition(1, 3));
        payload.setResultingState(nextState("white", null, boardWithPieces(0, 1)));

        RoomState updated = service.makeMove("guest-client", payload);

        assertThat(updated).isSameAs(room);
        assertThat(updated.getWinner()).isEqualTo("black");
        assertThat(updated.getStatus()).isEqualTo("finished");
    }

    @Test
    void reset_requiresHostAndClearsGameState() {
        RoomState room = startedRoom();

        assertThat(service.reset("host-client", "missing")).isNull();
        assertThat(service.reset("guest-client", room.getRoomCode())).isNull();

        RoomState updated = service.reset("host-client", room.getRoomCode());

        assertThat(updated).isSameAs(room);
        assertThat(updated.getStatus()).isEqualTo("waiting");
        assertThat(updated.getGameState()).isNull();
        assertThat(updated.getWinner()).isNull();
        assertThat(updated.getMoveCount()).isZero();
    }

    @Test
    void disconnect_reassignsHostAndFinishesActiveGame() {
        RoomState room = startedRoom();

        RoomState updated = service.disconnect("host-client", room.getRoomCode());

        assertThat(updated).isSameAs(room);
        assertThat(updated.getParticipants()).singleElement().satisfies(participant -> {
            assertThat(participant.getClientId()).isEqualTo("guest-client");
            assertThat(participant.getPieceColor()).isEqualTo("white");
        });
        assertThat(updated.getHostClientId()).isEqualTo("guest-client");
        assertThat(updated.getStatus()).isEqualTo("finished");
        assertThat(updated.getWinner()).isEqualTo("white");
    }

    @Test
    void disconnect_handlesMissingUnknownAndLastParticipantBranches() {
        assertThat(service.disconnect("ghost", "missing")).isNull();

        RoomState room = waitingRoom();
        RoomState startedRoom = startedRoom();

        assertThat(service.disconnect("stranger", room.getRoomCode())).isSameAs(room);
        assertThat(room.getParticipants()).hasSize(2);
        assertThat(service.disconnect("stranger", startedRoom.getRoomCode())).isSameAs(startedRoom);
        assertThat(startedRoom.getParticipants()).hasSize(2);
        assertThat(startedRoom.getStatus()).isEqualTo("playing");

        assertThat(service.disconnect("guest-client", room.getRoomCode())).isSameAs(room);
        assertThat(room.getParticipants()).singleElement().extracting(cmpe195.group1.minigameplatform.games.checkers.model.RoomParticipant::getClientId)
            .isEqualTo("host-client");
        assertThat(room.getHostClientId()).isEqualTo("host-client");

        assertThat(service.disconnect("host-client", room.getRoomCode())).isNull();
        assertThat(service.getRoom(room.getRoomCode())).isNull();
    }

    @Test
    void disconnect_reassignsHostInWaitingRoomWithoutFinishingMatch() {
        RoomState room = waitingRoom();

        RoomState updated = service.disconnect("host-client", room.getRoomCode());

        assertThat(updated).isSameAs(room);
        assertThat(updated.getHostClientId()).isEqualTo("guest-client");
        assertThat(updated.getParticipants()).singleElement().satisfies(participant -> {
            assertThat(participant.getClientId()).isEqualTo("guest-client");
            assertThat(participant.getPieceColor()).isEqualTo("white");
        });
        assertThat(updated.getStatus()).isEqualTo("waiting");
        assertThat(updated.getWinner()).isNull();
    }

    @Test
    void disconnect_recolorsSecondRemainingParticipantWhenExtraPlayerStateExists() {
        RoomState room = waitingRoom();
        room.getParticipants().add(new cmpe195.group1.minigameplatform.games.checkers.model.RoomParticipant(3, "Third", "third-client", "green"));

        RoomState updated = service.disconnect("host-client", room.getRoomCode());

        assertThat(updated).isSameAs(room);
        assertThat(updated.getHostClientId()).isEqualTo("guest-client");
        assertThat(updated.getParticipants()).hasSize(2);
        assertThat(updated.getParticipants().get(0).getPieceColor()).isEqualTo("white");
        assertThat(updated.getParticipants().get(1).getPieceColor()).isEqualTo("black");
    }

    private RoomScopedPayload.JoinRoomRequest joinRequest(String roomCode, String playerName) {
        RoomScopedPayload.JoinRoomRequest joinRequest = new RoomScopedPayload.JoinRoomRequest();
        joinRequest.setRoomCode(roomCode);
        joinRequest.setPlayerName(playerName);
        return joinRequest;
    }

    private MovePayload move(String roomCode, CheckersGameState resultingState) {
        MovePayload payload = new MovePayload();
        payload.setRoomCode(roomCode);
        payload.setFrom(new CheckersPosition(0, 5));
        payload.setTo(new CheckersPosition(1, 4));
        payload.setResultingState(resultingState);
        return payload;
    }

    private RoomState waitingRoom() {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());
        service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "Guest"));
        return room;
    }

    private RoomState startedRoom() {
        RoomState room = waitingRoom();
        service.startGame("host-client", room.getRoomCode());
        return room;
    }

    private CheckersGameState nextState(String turn, CheckersPosition selected, List<List<CheckersPiece>> board) {
        CheckersGameState gameState = new CheckersGameState();
        gameState.setTurn(turn);
        gameState.setSelected(selected);
        gameState.setBoard(board);
        return gameState;
    }

    private List<List<CheckersPiece>> boardWithPieces(int whiteCount, int blackCount) {
        List<List<CheckersPiece>> board = new ArrayList<>();
        for (int y = 0; y < 8; y++) {
            List<CheckersPiece> row = new ArrayList<>();
            for (int x = 0; x < 8; x++) {
                row.add(null);
            }
            board.add(row);
        }
        for (int i = 0; i < whiteCount; i++) {
            board.get(7).set(i, new CheckersPiece("white", false));
        }
        for (int i = 0; i < blackCount; i++) {
            board.get(0).set(i, new CheckersPiece("black", false));
        }
        return board;
    }

    private Random sequenceRandom(int... values) {
        return new Random() {
            private int index;

            @Override
            public int nextInt(int bound) {
                return values[index++];
            }
        };
    }

    private void setRandom(Random random) throws Exception {
        Field randomField = CheckersRoomService.class.getDeclaredField("random");
        randomField.setAccessible(true);
        randomField.set(service, random);
    }

    @SuppressWarnings("unchecked")
    private void registerRoomUnderCode(RoomState room, String roomCode) throws Exception {
        room.setRoomCode(roomCode);
        Field roomsField = CheckersRoomService.class.getDeclaredField("rooms");
        roomsField.setAccessible(true);
        Map<String, RoomState> rooms = (Map<String, RoomState>) roomsField.get(service);
        rooms.put(roomCode, room);
    }
}

