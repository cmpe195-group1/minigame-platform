package cmpe195.group1.minigameplatform.games.knockout.service;

import cmpe195.group1.minigameplatform.games.knockout.model.KnockoutGameState;
import cmpe195.group1.minigameplatform.games.knockout.model.LastShot;
import cmpe195.group1.minigameplatform.games.knockout.model.PuckState;
import cmpe195.group1.minigameplatform.games.knockout.model.RoomParticipant;
import cmpe195.group1.minigameplatform.games.knockout.model.RoomState;
import cmpe195.group1.minigameplatform.games.knockout.payload.ResolveTurnPayload;
import cmpe195.group1.minigameplatform.games.knockout.payload.ShotPayload;
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

class KnockoutRoomServiceTest {

    private KnockoutRoomService service;

    @BeforeEach
    void setUp() {
        service = new KnockoutRoomService();
    }

    @Test
    void createRoom_getRoomAndRoomCodeOfHandleDefaultsAndNulls() {
        RoomState createdWithNullPayload = service.createRoom("host-client", null);

        assertThat(createdWithNullPayload.getRoomCode()).hasSize(6);
        assertThat(createdWithNullPayload.getParticipants()).singleElement().satisfies(participant -> {
            assertThat(participant.getName()).isEqualTo("Player 1");
            assertThat(participant.getSide()).isEqualTo("A");
        });
        assertThat(createdWithNullPayload.getStatus()).isEqualTo("waiting");
        assertThat(createdWithNullPayload.getGameState()).isNull();
        assertThat(createdWithNullPayload.getLastShot()).isNull();
        assertThat(service.getRoom(createdWithNullPayload.getRoomCode().toLowerCase())).isSameAs(createdWithNullPayload);
        assertThat(service.getRoom(null)).isNull();
        assertThat(service.roomCodeOf(createdWithNullPayload)).isEqualTo(createdWithNullPayload.getRoomCode());
        assertThat(service.roomCodeOf(null)).isNull();
    }

    @Test
    void createRoom_usesResolvedHostNameFromPayload() {
        CreateRoomRequest payload = new CreateRoomRequest();
        payload.setHostName("Host Player");

        RoomState room = service.createRoom("host-client", payload);

        assertThat(room.getParticipants()).singleElement().extracting(RoomParticipant::getName).isEqualTo("Host Player");
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
        assertThat(room.getParticipants()).singleElement().extracting(RoomParticipant::getName).isEqualTo("Player 1");
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
        assertThat(joinResult.getRoom()).isSameAs(room);
        assertThat(room.getParticipants()).hasSize(2);
        assertThat(room.getParticipants().get(1).getName()).isEqualTo("Player 2");
        assertThat(room.getParticipants().get(1).getSide()).isEqualTo("B");
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
        assertThat(room.getParticipants()).hasSize(1);
        assertThat(nullPayload.getError()).isEqualTo("Room not found. Check the code and try again.");
        assertThat(missingCode.getError()).isEqualTo("Room not found. Check the code and try again.");
    }

    @Test
    void joinRoom_acceptsNullPayloadWhenRoomIsRegisteredUnderEmptyCodeAndPreservesProvidedName() throws Exception {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());
        registerRoomUnderCode(room, "");

        RoomActionResult<RoomState> nullPayloadResult = service.joinRoom("guest-client", null);

        assertThat(nullPayloadResult.isOk()).isTrue();
        assertThat(nullPayloadResult.getRoom()).isSameAs(room);
        assertThat(room.getParticipants()).hasSize(2);
        assertThat(room.getParticipants().get(1).getName()).isEqualTo("Player 2");

        RoomState namedRoom = service.createRoom("host-2", new CreateRoomRequest());
        RoomActionResult<RoomState> roomIdResult = service.joinRoom("guest-2", joinRequestByRoomId(namedRoom.getRoomCode(), "Guest Name"));

        assertThat(roomIdResult.isOk()).isTrue();
        assertThat(namedRoom.getParticipants().get(1).getName()).isEqualTo("Guest Name");
    }

    @Test
    void startGame_requiresExistingRoomHostAndEnoughPlayers() {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());

        assertThat(service.startGame("host-client", "missing")).isNull();
        assertThat(service.startGame("guest-client", room.getRoomCode())).isNull();
        assertThat(service.startGame("host-client", room.getRoomCode())).isNull();

        service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "Guest"));

        RoomState started = service.startGame("host-client", room.getRoomCode());

        assertThat(started).isSameAs(room);
        assertThat(started.getStatus()).isEqualTo("playing");
        assertThat(started.getLastShot()).isNull();
        assertThat(started.getGameState()).isNotNull();
        assertThat(started.getGameState().getCurrentPlayer()).isEqualTo("A");
        assertThat(started.getGameState().getPhase()).isEqualTo("aiming");
        assertThat(started.getGameState().getWinner()).isNull();
        assertThat(started.getGameState().getTurnNumber()).isEqualTo(1);
        assertThat(started.getGameState().getPucks()).hasSize(12);
        assertThat(started.getGameState().getPucks().subList(0, 6))
            .extracting(PuckState::getId, PuckState::getPlayer, PuckState::getX, PuckState::isActive)
            .containsExactly(
                org.assertj.core.groups.Tuple.tuple("A-1", "A", 170.0, true),
                org.assertj.core.groups.Tuple.tuple("A-2", "A", 170.0, true),
                org.assertj.core.groups.Tuple.tuple("A-3", "A", 170.0, true),
                org.assertj.core.groups.Tuple.tuple("A-4", "A", 170.0, true),
                org.assertj.core.groups.Tuple.tuple("A-5", "A", 170.0, true),
                org.assertj.core.groups.Tuple.tuple("A-6", "A", 170.0, true)
            );
        assertThat(started.getGameState().getPucks().subList(6, 12))
            .extracting(PuckState::getId, PuckState::getPlayer, PuckState::getX, PuckState::isActive)
            .containsExactly(
                org.assertj.core.groups.Tuple.tuple("B-1", "B", 630.0, true),
                org.assertj.core.groups.Tuple.tuple("B-2", "B", 630.0, true),
                org.assertj.core.groups.Tuple.tuple("B-3", "B", 630.0, true),
                org.assertj.core.groups.Tuple.tuple("B-4", "B", 630.0, true),
                org.assertj.core.groups.Tuple.tuple("B-5", "B", 630.0, true),
                org.assertj.core.groups.Tuple.tuple("B-6", "B", 630.0, true)
            );
        assertThat(started.getGameState().getPucks()).extracting(PuckState::getY)
            .containsExactly(140.0, 198.0, 256.0, 314.0, 372.0, 430.0, 140.0, 198.0, 256.0, 314.0, 372.0, 430.0);
    }

    @Test
    void recordShot_rejectsInvalidPayloadStateParticipantTurnAndTurnNumber() {
        RoomState room = startedRoom();

        assertThat(service.recordShot("host-client", null)).isNull();

        ShotPayload missingRoomPayload = new ShotPayload();
        missingRoomPayload.setRoomCode("missing");
        assertThat(service.recordShot("host-client", missingRoomPayload)).isNull();

        room.setStatus("waiting");
        assertThat(service.recordShot("host-client", shot(room.getRoomCode(), 1, "A-1", 2.0, 3.0))).isNull();

        room.setStatus("playing");
        room.setGameState(null);
        assertThat(service.recordShot("host-client", shot(room.getRoomCode(), 1, "A-1", 2.0, 3.0))).isNull();

        room.setGameState(state("A", "aiming", null, 1, pucks("A", true, "B", true)));
        assertThat(service.recordShot("outsider", shot(room.getRoomCode(), 1, "A-1", 2.0, 3.0))).isNull();
        assertThat(service.recordShot("guest-client", shot(room.getRoomCode(), 1, "B-1", 2.0, 3.0))).isNull();
        assertThat(service.recordShot("host-client", shot(room.getRoomCode(), 2, "A-1", 2.0, 3.0))).isNull();
    }

    @Test
    void recordShot_recordsLastShotAndMarksStateWaiting() {
        RoomState room = startedRoom();
        room.setGameState(state("A", "aiming", null, 3, pucks("A", true, "B", true)));

        RoomState updated = service.recordShot("host-client", shot(room.getRoomCode(), 3, "A-2", 4.5, -1.25));

        assertThat(updated).isSameAs(room);
        assertThat(updated.getLastShot()).isNotNull();
        assertThat(updated.getLastShot().getPuckId()).isEqualTo("A-2");
        assertThat(updated.getLastShot().getTurnNumber()).isEqualTo(3);
        assertThat(updated.getLastShot().getImpulseX()).isEqualTo(4.5);
        assertThat(updated.getLastShot().getImpulseY()).isEqualTo(-1.25);
        assertThat(updated.getLastShot().getShooterClientId()).isEqualTo("host-client");
        assertThat(updated.getGameState().getPhase()).isEqualTo("waiting");
    }

    @Test
    void resolveTurn_rejectsInvalidPayloadStateParticipantAndTurn() {
        RoomState room = startedRoom();

        assertThat(service.resolveTurn("host-client", null)).isNull();

        ResolveTurnPayload missingState = new ResolveTurnPayload();
        missingState.setRoomCode(room.getRoomCode());
        assertThat(service.resolveTurn("host-client", missingState)).isNull();

        ResolveTurnPayload missingRoom = new ResolveTurnPayload();
        missingRoom.setRoomCode("missing");
        missingRoom.setResultingState(new KnockoutGameState());
        assertThat(service.resolveTurn("host-client", missingRoom)).isNull();

        room.setStatus("waiting");
        assertThat(service.resolveTurn("host-client", resolve(room.getRoomCode(), state("A", "aiming", null, 2, pucks("A", true, "B", true))))).isNull();

        room.setStatus("playing");
        room.setGameState(null);
        assertThat(service.resolveTurn("host-client", resolve(room.getRoomCode(), state("A", "aiming", null, 2, pucks("A", true, "B", true))))).isNull();

        room.setGameState(state("A", "waiting", null, 1, pucks("A", true, "B", true)));
        assertThat(service.resolveTurn("outsider", resolve(room.getRoomCode(), state("B", "aiming", null, 2, pucks("A", true, "B", true))))).isNull();
        assertThat(service.resolveTurn("guest-client", resolve(room.getRoomCode(), state("B", "aiming", null, 2, pucks("A", true, "B", true))))).isNull();

        ResolveTurnPayload toggledPayload = new ResolveTurnPayload() {
            private int invocationCount;

            @Override
            public KnockoutGameState getResultingState() {
                invocationCount++;
                return invocationCount == 1 ? new KnockoutGameState() : null;
            }
        };
        toggledPayload.setRoomCode(room.getRoomCode());

        assertThat(service.resolveTurn("host-client", toggledPayload)).isNull();
    }

    @Test
    void resolveTurn_copiesNextStateClearsLastShotAndKeepsGamePlaying() {
        RoomState room = startedRoom();
        room.setLastShot(new LastShot("A-1", 1, 1.0, 2.0, "host-client"));
        room.setGameState(state("A", "waiting", null, 1, pucks("A", true, "B", true)));

        List<PuckState> nextPucks = new ArrayList<>(List.of(
            new PuckState("A-1", "A", 181.0, 222.0, true),
            new PuckState("B-1", "B", 612.0, 240.0, false)
        ));
        KnockoutGameState nextState = state("B", "aiming", null, 2, nextPucks);

        RoomState updated = service.resolveTurn("host-client", resolve(room.getRoomCode(), nextState));

        assertThat(updated).isSameAs(room);
        assertThat(updated.getStatus()).isEqualTo("playing");
        assertThat(updated.getLastShot()).isNull();
        assertThat(updated.getGameState()).isNotSameAs(nextState);
        assertThat(updated.getGameState().getCurrentPlayer()).isEqualTo("B");
        assertThat(updated.getGameState().getPhase()).isEqualTo("aiming");
        assertThat(updated.getGameState().getWinner()).isNull();
        assertThat(updated.getGameState().getTurnNumber()).isEqualTo(2);
        assertThat(updated.getGameState().getPucks()).hasSize(2);
        assertThat(updated.getGameState().getPucks()).isNotSameAs(nextPucks);
        assertThat(updated.getGameState().getPucks().get(0)).isNotSameAs(nextPucks.get(0));
        assertThat(updated.getGameState().getPucks().get(1)).isNotSameAs(nextPucks.get(1));
        assertThat(updated.getGameState().getPucks().get(0).getX()).isEqualTo(181.0);
        assertThat(updated.getGameState().getPucks().get(1).isActive()).isFalse();

        nextPucks.get(0).setX(999.0);
        nextPucks.clear();

        assertThat(updated.getGameState().getPucks()).hasSize(2);
        assertThat(updated.getGameState().getPucks().get(0).getX()).isEqualTo(181.0);
    }

    @Test
    void resolveTurn_marksRoomFinishedWhenPhaseIsFinishedOrWinnerExistsAndHandlesNullPucks() {
        RoomState phaseFinishedRoom = startedRoom();
        phaseFinishedRoom.setLastShot(new LastShot("A-1", 1, 0.0, 0.0, "host-client"));
        phaseFinishedRoom.setGameState(state("A", "waiting", null, 1, pucks("A", true, "B", true)));

        RoomState phaseFinished = service.resolveTurn(
            "host-client",
            resolve(phaseFinishedRoom.getRoomCode(), state("B", "finished", null, 2, null))
        );

        assertThat(phaseFinished).isSameAs(phaseFinishedRoom);
        assertThat(phaseFinished.getStatus()).isEqualTo("finished");
        assertThat(phaseFinished.getLastShot()).isNull();
        assertThat(phaseFinished.getGameState().getPucks()).isEmpty();

        RoomState winnerRoom = startedRoom();
        winnerRoom.setGameState(state("A", "waiting", null, 1, pucks("A", true, "B", true)));

        RoomState winnerFinished = service.resolveTurn(
            "host-client",
            resolve(winnerRoom.getRoomCode(), state("B", "aiming", "A", 2, pucks("A", true, "B", false)))
        );

        assertThat(winnerFinished).isSameAs(winnerRoom);
        assertThat(winnerFinished.getStatus()).isEqualTo("finished");
        assertThat(winnerFinished.getGameState().getWinner()).isEqualTo("A");
    }

    @Test
    void reset_requiresHostAndClearsGameState() {
        RoomState room = startedRoom();
        room.setLastShot(new LastShot("A-1", 1, 2.0, 3.0, "host-client"));

        assertThat(service.reset("host-client", "missing")).isNull();
        assertThat(service.reset("guest-client", room.getRoomCode())).isNull();

        RoomState updated = service.reset("host-client", room.getRoomCode());

        assertThat(updated).isSameAs(room);
        assertThat(updated.getStatus()).isEqualTo("waiting");
        assertThat(updated.getGameState()).isNull();
        assertThat(updated.getLastShot()).isNull();
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
        assertThat(room.getParticipants()).singleElement().extracting(RoomParticipant::getClientId).isEqualTo("host-client");
        assertThat(room.getHostClientId()).isEqualTo("host-client");

        assertThat(service.disconnect("host-client", room.getRoomCode())).isNull();
        assertThat(service.getRoom(room.getRoomCode())).isNull();
    }

    @Test
    void disconnect_reassignsHostInWaitingRoomAndRecolorsExtraParticipants() {
        RoomState room = waitingRoom();
        room.getParticipants().add(new RoomParticipant(3, "Third", "third-client", "C"));

        RoomState updated = service.disconnect("host-client", room.getRoomCode());

        assertThat(updated).isSameAs(room);
        assertThat(updated.getHostClientId()).isEqualTo("guest-client");
        assertThat(updated.getParticipants()).hasSize(2);
        assertThat(updated.getParticipants().get(0).getClientId()).isEqualTo("guest-client");
        assertThat(updated.getParticipants().get(0).getSide()).isEqualTo("A");
        assertThat(updated.getParticipants().get(1).getClientId()).isEqualTo("third-client");
        assertThat(updated.getParticipants().get(1).getSide()).isEqualTo("B");
        assertThat(updated.getStatus()).isEqualTo("waiting");
    }

    @Test
    void disconnect_finishesActiveGameWhenOnlyOnePlayerRemains() {
        RoomState room = startedRoom();

        RoomState updated = service.disconnect("host-client", room.getRoomCode());

        assertThat(updated).isSameAs(room);
        assertThat(updated.getParticipants()).singleElement().satisfies(participant -> {
            assertThat(participant.getClientId()).isEqualTo("guest-client");
            assertThat(participant.getSide()).isEqualTo("A");
        });
        assertThat(updated.getHostClientId()).isEqualTo("guest-client");
        assertThat(updated.getStatus()).isEqualTo("finished");
        assertThat(updated.getGameState().getWinner()).isEqualTo("A");
        assertThat(updated.getGameState().getPhase()).isEqualTo("finished");
    }

    private RoomScopedPayload.JoinRoomRequest joinRequest(String roomCode, String playerName) {
        RoomScopedPayload.JoinRoomRequest joinRequest = new RoomScopedPayload.JoinRoomRequest();
        joinRequest.setRoomCode(roomCode);
        joinRequest.setPlayerName(playerName);
        return joinRequest;
    }

    private RoomScopedPayload.JoinRoomRequest joinRequestByRoomId(String roomId, String playerName) {
        RoomScopedPayload.JoinRoomRequest joinRequest = new RoomScopedPayload.JoinRoomRequest();
        joinRequest.setRoomId(roomId);
        joinRequest.setPlayerName(playerName);
        return joinRequest;
    }

    private ShotPayload shot(String roomCode, int turnNumber, String puckId, double impulseX, double impulseY) {
        ShotPayload payload = new ShotPayload();
        payload.setRoomCode(roomCode);
        payload.setTurnNumber(turnNumber);
        payload.setPuckId(puckId);
        payload.setImpulseX(impulseX);
        payload.setImpulseY(impulseY);
        return payload;
    }

    private ResolveTurnPayload resolve(String roomCode, KnockoutGameState resultingState) {
        ResolveTurnPayload payload = new ResolveTurnPayload();
        payload.setRoomCode(roomCode);
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

    private KnockoutGameState state(String currentPlayer, String phase, String winner, int turnNumber, List<PuckState> pucks) {
        KnockoutGameState gameState = new KnockoutGameState();
        gameState.setCurrentPlayer(currentPlayer);
        gameState.setPhase(phase);
        gameState.setWinner(winner);
        gameState.setTurnNumber(turnNumber);
        gameState.setPucks(pucks);
        return gameState;
    }

    private List<PuckState> pucks(String firstPlayer, boolean firstActive, String secondPlayer, boolean secondActive) {
        return new ArrayList<>(List.of(
            new PuckState(firstPlayer + "-1", firstPlayer, 100.0, 100.0, firstActive),
            new PuckState(secondPlayer + "-1", secondPlayer, 200.0, 200.0, secondActive)
        ));
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
        Field randomField = KnockoutRoomService.class.getDeclaredField("random");
        randomField.setAccessible(true);
        randomField.set(service, random);
    }

    @SuppressWarnings("unchecked")
    private void registerRoomUnderCode(RoomState room, String roomCode) throws Exception {
        room.setRoomCode(roomCode);
        Field roomsField = KnockoutRoomService.class.getDeclaredField("rooms");
        roomsField.setAccessible(true);
        Map<String, RoomState> rooms = (Map<String, RoomState>) roomsField.get(service);
        rooms.put(roomCode, room);
    }
}



