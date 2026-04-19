package cmpe195.group1.minigameplatform.games.archery.service;

import cmpe195.group1.minigameplatform.games.archery.model.ArcheryRoomState;
import cmpe195.group1.minigameplatform.games.archery.payload.ArcheryArrowShotPayload;
import cmpe195.group1.minigameplatform.multiplayer.payload.CreateRoomRequest;
import cmpe195.group1.minigameplatform.multiplayer.payload.RoomScopedPayload;
import cmpe195.group1.minigameplatform.multiplayer.service.RoomActionResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ArcheryRoomServiceTest {

    private ArcheryRoomService service;

    @BeforeEach
    void setUp() {
        service = new ArcheryRoomService();
    }

    @Test
    void createRoom_trimsNameAndClampsPlayers() {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setPlayerName("  This player name is definitely too long  ");
        request.setMaxPlayers(10);

        ArcheryRoomState room = service.createRoom("host-client", request);

        assertThat(room.getId()).hasSize(5);
        assertThat(room.getMaxPlayers()).isEqualTo(4);
        assertThat(room.getPlayers()).singleElement().satisfies(player -> {
            assertThat(player.getId()).isEqualTo("host-client");
            assertThat(player.getName()).isEqualTo("This player name is ");
            assertThat(player.getColor()).isEqualTo("#e74c3c");
        });
    }

    @Test
    void getRoomAndRoomCodeOfHandleNullsAndDefaultName() {
        ArcheryRoomState nullPayloadRoom = service.createRoom("host-client", null);

        assertThat(nullPayloadRoom.getPlayers()).singleElement().satisfies(player -> assertThat(player.getName()).isEqualTo("Player 1"));
        assertThat(service.getRoom(nullPayloadRoom.getId().toLowerCase())).isSameAs(nullPayloadRoom);
        assertThat(service.getRoom(null)).isNull();
        assertThat(service.roomCodeOf(nullPayloadRoom)).isEqualTo(nullPayloadRoom.getId());
        assertThat(service.roomCodeOf(null)).isNull();
    }

    @Test
    void joinRoom_handlesMissingDuplicateStartedAndFullBranches() {
        assertThat(service.joinRoom("ghost", joinRequest("missing", "Ghost")).getError())
            .isEqualTo("Room not found. Check the code and try again.");

        CreateRoomRequest request = new CreateRoomRequest();
        request.setMaxPlayers(2);
        ArcheryRoomState room = service.createRoom("host-client", request);

        RoomActionResult<ArcheryRoomState> joined = service.joinRoom("guest-client", joinRequest(room.getId(), "   "));

        assertThat(joined.isOk()).isTrue();
        assertThat(room.getPlayers()).hasSize(2);
        assertThat(room.getPlayers().get(1).getName()).isEqualTo("Player 2");
        assertThat(service.joinRoom("guest-client", joinRequest(room.getId(), "Again")).getRoom()).isSameAs(room);
        assertThat(service.joinRoom("extra-client", joinRequest(room.getId(), "Extra")).getError()).isEqualTo("Room is full.");

        room.setState("playing");

        assertThat(service.joinRoom("late-client", joinRequest(room.getId(), "Late")).getError()).isEqualTo("This game has already started.");
    }

    @Test
    void joinRoom_returnsExistingRoomForSameClientBeforeRoomIsFull() {
        ArcheryRoomState room = service.createRoom("host-client", new CreateRoomRequest());

        RoomActionResult<ArcheryRoomState> result = service.joinRoom("host-client", joinRequest(room.getId(), "Host Again"));

        assertThat(result.isOk()).isTrue();
        assertThat(result.getRoom()).isSameAs(room);
        assertThat(room.getPlayers()).singleElement();
    }

    @Test
    void joinRoom_acceptsNullPayloadWhenRoomIsRegisteredUnderEmptyCode() throws Exception {
        ArcheryRoomState room = service.createRoom("host-client", new CreateRoomRequest());
        registerRoomUnderCode(room, "");

        RoomActionResult<ArcheryRoomState> result = service.joinRoom("guest-client", null);

        assertThat(result.isOk()).isTrue();
        assertThat(result.getRoom()).isSameAs(room);
        assertThat(room.getPlayers()).hasSize(2);
        assertThat(room.getPlayers().get(1).getName()).isEqualTo("Player 2");
    }

    @Test
    void setReady_autoStartsWhenAllPlayersAreReady() {
        ArcheryRoomState room = service.createRoom("host-client", new CreateRoomRequest());
        service.joinRoom("guest-client", joinRequest(room.getId(), "Guest"));

        RoomActionResult<ArcheryRoomState> hostReady = service.setReady("host-client", room.getId());
        RoomActionResult<ArcheryRoomState> guestReady = service.setReady("guest-client", room.getId());

        assertThat(hostReady.isOk()).isTrue();
        assertThat(guestReady.isOk()).isTrue();
        assertThat(room.getState()).isEqualTo("playing");
        assertThat(room.getCurrentSlot()).isZero();
        assertThat(room.getCurrentRound()).isEqualTo(1);
        assertThat(room.getPlayers()).allSatisfy(player -> {
            assertThat(player.getScores()).isEmpty();
            assertThat(player.getTotal()).isZero();
        });
    }

    @Test
    void setReady_handlesMissingStartedAndUnknownPlayerBranches() {
        assertThat(service.setReady("ghost", "missing").getError()).isEqualTo("Room not found.");

        ArcheryRoomState room = service.createRoom("host-client", new CreateRoomRequest());

        assertThat(service.setReady("ghost", room.getId()).getError()).isEqualTo("You are not in this room.");
        assertThat(service.setReady("host-client", room.getId()).isOk()).isTrue();
        assertThat(room.getState()).isEqualTo("waiting");

        service.joinRoom("guest-client", joinRequest(room.getId(), "Guest"));

        RoomActionResult<ArcheryRoomState> hostReady = service.setReady("host-client", room.getId());

        assertThat(hostReady.isOk()).isTrue();
        assertThat(room.getState()).isEqualTo("waiting");

        room.setState("playing");

        assertThat(service.setReady("host-client", room.getId()).getError()).isEqualTo("Game already started.");
    }

    @Test
    void startGame_rejectsNonHostAndMissingPlayers() {
        ArcheryRoomState room = service.createRoom("host-client", new CreateRoomRequest());

        RoomActionResult<ArcheryRoomState> missingPlayers = service.startGame("host-client", room.getId());
        RoomActionResult<ArcheryRoomState> nonHost = service.startGame("guest-client", room.getId());

        assertThat(missingPlayers.isOk()).isFalse();
        assertThat(missingPlayers.getError()).isEqualTo("Need at least 2 players to start.");
        assertThat(nonHost.isOk()).isFalse();
        assertThat(nonHost.getError()).isEqualTo("Only the host can start the game.");
    }

    @Test
    void startGame_handlesMissingRoomAndAlreadyStartedBranches() {
        assertThat(service.startGame("ghost", "missing").getError()).isEqualTo("Room not found.");

        ArcheryRoomState room = service.createRoom("host-client", new CreateRoomRequest());
        service.joinRoom("guest-client", joinRequest(room.getId(), "Guest"));
        room.setState("playing");

        RoomActionResult<ArcheryRoomState> alreadyStarted = service.startGame("host-client", room.getId());

        assertThat(alreadyStarted.isOk()).isFalse();
        assertThat(alreadyStarted.getError()).isEqualTo("Game already started.");
    }

    @Test
    void recordArrowShot_updatesScoreAndAdvancesTurnAfterThreeShots() {
        ArcheryRoomState room = startedRoom();

        RoomActionResult<ArcheryRoomState> first = service.recordArrowShot("host-client", shot(room.getId(), 10, 1.2));
        RoomActionResult<ArcheryRoomState> second = service.recordArrowShot("host-client", shot(room.getId(), 8, 2.4));
        RoomActionResult<ArcheryRoomState> third = service.recordArrowShot("host-client", shot(room.getId(), 7, 3.6));

        assertThat(first.isOk()).isTrue();
        assertThat(second.isOk()).isTrue();
        assertThat(third.isOk()).isTrue();
        assertThat(room.getPlayers().get(0).getTotal()).isEqualTo(25);
        assertThat(room.getPlayers().get(0).getScores()).hasSize(3);
        assertThat(room.getLastShot().getSequence()).isEqualTo(3);
        assertThat(room.getCurrentSlot()).isEqualTo(1);
        assertThat(room.getArrowsFired()).isZero();
    }

    @Test
    void recordArrowShot_rejectsInvalidStatesAndNormalizesValues() {
        assertThat(service.recordArrowShot("host-client", null).getError()).isEqualTo("Missing shot payload.");

        ArcheryArrowShotPayload missingRoomShot = shot("missing", 3, 1.0);
        assertThat(service.recordArrowShot("host-client", missingRoomShot).getError()).isEqualTo("Room not found.");

        ArcheryRoomState room = startedRoom();
        room.setState("waiting");
        assertThat(service.recordArrowShot("host-client", shot(room.getId(), 3, 1.0)).getError()).isEqualTo("Game is not active.");

        room.setState("playing");
        room.setPlayers(new java.util.ArrayList<>());
        assertThat(service.recordArrowShot("host-client", shot(room.getId(), 3, 1.0)).getError()).isEqualTo("No active players in the room.");

        room = startedRoom();
        room.setCurrentSlot(-1);
        assertThat(service.recordArrowShot("host-client", shot(room.getId(), 3, 1.0)).getError()).isEqualTo("Turn order is out of sync.");

        room = startedRoom();
        room.setCurrentSlot(9);
        assertThat(service.recordArrowShot("host-client", shot(room.getId(), 3, 1.0)).getError()).isEqualTo("Turn order is out of sync.");

        room = startedRoom();
        assertThat(service.recordArrowShot("outsider", shot(room.getId(), 3, 1.0)).getError()).isEqualTo("You are not in this room.");
        assertThat(service.recordArrowShot("guest-client", shot(room.getId(), 3, 1.0)).getError()).isEqualTo("It is not your turn yet.");

        RoomActionResult<ArcheryRoomState> normalizedShot = service.recordArrowShot("host-client", shot(room.getId(), 99, -4.5, null, null));

        assertThat(normalizedShot.isOk()).isTrue();
        assertThat(room.getPlayers().get(0).getScores()).singleElement().satisfies(score -> {
            assertThat(score.getScore()).isEqualTo(10);
            assertThat(score.getDist()).isZero();
        });
        assertThat(room.getLastShot().getImpactX()).isZero();
        assertThat(room.getLastShot().getImpactY()).isZero();
        assertThat(room.getArrowsFired()).isEqualTo(1);

        ArcheryRoomState nullValueRoom = startedRoom();

        RoomActionResult<ArcheryRoomState> nullValueShot = service.recordArrowShot("host-client", shot(nullValueRoom.getId(), null, null, null, null));

        assertThat(nullValueShot.isOk()).isTrue();
        assertThat(nullValueRoom.getPlayers().get(0).getScores()).singleElement().satisfies(score -> {
            assertThat(score.getScore()).isZero();
            assertThat(score.getDist()).isZero();
        });
    }

    @Test
    void recordArrowShot_rollsToNextRoundAfterLastPlayerInNonFinalRound() {
        ArcheryRoomState room = startedRoom();
        room.setCurrentSlot(1);
        room.setArrowsFired(room.getArrowsPerRound() - 1);

        RoomActionResult<ArcheryRoomState> result = service.recordArrowShot("guest-client", shot(room.getId(), 6, 2.0));

        assertThat(result.isOk()).isTrue();
        assertThat(room.getCurrentRound()).isEqualTo(2);
        assertThat(room.getCurrentSlot()).isZero();
        assertThat(room.getArrowsFired()).isZero();
    }

    @Test
    void recordArrowShot_finishesLastRoundForLastPlayer() {
        ArcheryRoomState room = startedRoom();
        room.setCurrentRound(room.getTotalRounds());
        room.setCurrentSlot(1);
        room.setArrowsFired(room.getArrowsPerRound() - 1);

        RoomActionResult<ArcheryRoomState> result = service.recordArrowShot("guest-client", shot(room.getId(), 9, 1.0));

        assertThat(result.isOk()).isTrue();
        assertThat(room.getState()).isEqualTo("finished");
        assertThat(room.getCurrentSlot()).isZero();
    }

    @Test
    void disconnect_reassignsHostAndFinishesGameWhenOnlyOnePlayerRemains() {
        ArcheryRoomState room = startedRoom();

        ArcheryRoomState updated = service.disconnect("host-client", room.getId());

        assertThat(updated).isSameAs(room);
        assertThat(updated.getHostId()).isEqualTo("guest-client");
        assertThat(updated.getPlayers()).singleElement().satisfies(player -> {
            assertThat(player.getId()).isEqualTo("guest-client");
            assertThat(player.getSlotIdx()).isZero();
            assertThat(player.getColor()).isEqualTo("#e74c3c");
        });
        assertThat(updated.getState()).isEqualTo("finished");
    }

    @Test
    void disconnect_handlesMissingUnknownCurrentSlotAdjustmentAndRoomRemoval() {
        assertThat(service.disconnect("ghost", "missing")).isNull();

        CreateRoomRequest request = new CreateRoomRequest();
        request.setMaxPlayers(4);
        ArcheryRoomState room = service.createRoom("host-client", request);
        service.joinRoom("guest-client", joinRequest(room.getId(), "Guest"));
        service.joinRoom("guest-2", joinRequest(room.getId(), "Guest Two"));
        service.startGame("host-client", room.getId());

        assertThat(service.disconnect("outsider", room.getId())).isSameAs(room);

        room.setCurrentSlot(2);

        ArcheryRoomState updated = service.disconnect("guest-client", room.getId());

        assertThat(updated).isSameAs(room);
        assertThat(updated.getPlayers()).hasSize(2);
        assertThat(updated.getCurrentSlot()).isEqualTo(1);
        assertThat(updated.getPlayers().get(1).getId()).isEqualTo("guest-2");
        assertThat(updated.getPlayers().get(1).getSlotIdx()).isEqualTo(1);
        assertThat(updated.getPlayers().get(1).getColor()).isEqualTo("#3498db");

        CreateRoomRequest wrapRequest = new CreateRoomRequest();
        wrapRequest.setMaxPlayers(4);
        ArcheryRoomState wrapRoom = service.createRoom("wrap-host", wrapRequest);
        service.joinRoom("wrap-guest-1", joinRequest(wrapRoom.getId(), "Guest One"));
        service.joinRoom("wrap-guest-2", joinRequest(wrapRoom.getId(), "Guest Two"));
        service.startGame("wrap-host", wrapRoom.getId());
        wrapRoom.setCurrentSlot(2);

        ArcheryRoomState wrapped = service.disconnect("wrap-guest-2", wrapRoom.getId());

        assertThat(wrapped).isSameAs(wrapRoom);
        assertThat(wrapped.getCurrentSlot()).isZero();

        ArcheryRoomState soloRoom = service.createRoom("solo-host", new CreateRoomRequest());

        assertThat(service.disconnect("solo-host", soloRoom.getId())).isNull();
        assertThat(service.getRoom(soloRoom.getId())).isNull();
    }

    private ArcheryRoomState startedRoom() {
        ArcheryRoomState room = service.createRoom("host-client", new CreateRoomRequest());
        service.joinRoom("guest-client", joinRequest(room.getId(), "Guest"));
        service.startGame("host-client", room.getId());
        return room;
    }

    private RoomScopedPayload.JoinRoomRequest joinRequest(String roomId, String playerName) {
        RoomScopedPayload.JoinRoomRequest request = new RoomScopedPayload.JoinRoomRequest();
        request.setRoomId(roomId);
        request.setPlayerName(playerName);
        return request;
    }

    private ArcheryArrowShotPayload shot(String roomId, int score, double dist) {
        ArcheryArrowShotPayload payload = new ArcheryArrowShotPayload();
        payload.setRoomId(roomId);
        payload.setScore(score);
        payload.setDist(dist);
        payload.setImpactX(0.5);
        payload.setImpactY(-0.25);
        return payload;
    }

    private ArcheryArrowShotPayload shot(String roomId, Integer score, Double dist, Double impactX, Double impactY) {
        ArcheryArrowShotPayload payload = new ArcheryArrowShotPayload();
        payload.setRoomId(roomId);
        payload.setScore(score);
        payload.setDist(dist);
        payload.setImpactX(impactX);
        payload.setImpactY(impactY);
        return payload;
    }

    @SuppressWarnings("unchecked")
    private void registerRoomUnderCode(ArcheryRoomState room, String roomId) throws Exception {
        room.setId(roomId);
        Field roomsField = ArcheryRoomService.class.getDeclaredField("rooms");
        roomsField.setAccessible(true);
        Map<String, ArcheryRoomState> rooms = (Map<String, ArcheryRoomState>) roomsField.get(service);
        rooms.put(roomId, room);
    }
}

