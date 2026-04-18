package cmpe195.group1.minigameplatform.games.uno.service;

import cmpe195.group1.minigameplatform.games.uno.model.RoomState;
import cmpe195.group1.minigameplatform.games.uno.payload.PublishStatePayload;
import cmpe195.group1.minigameplatform.games.uno.payload.SubmitActionPayload;
import cmpe195.group1.minigameplatform.games.uno.payload.UpdateSettingsPayload;
import cmpe195.group1.minigameplatform.multiplayer.payload.CreateRoomRequest;
import cmpe195.group1.minigameplatform.multiplayer.payload.RoomScopedPayload;
import cmpe195.group1.minigameplatform.multiplayer.service.RoomActionResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RoomServiceTest {

    private RoomService service;

    @BeforeEach
    void setUp() {
        service = new RoomService();
    }

    @Test
    void createRoom_defaultsHostNameAndStoresRoom() {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());

        assertThat(room.getParticipants())
            .singleElement()
            .extracting(RoomState.RoomParticipant::getPlayerId, RoomState.RoomParticipant::getName)
            .containsExactly("host-player", "Host");
        assertThat(service.getRoom(room.getRoomCode().toLowerCase())).isSameAs(room);
    }

    @Test
    void getRoom_returnsNullForNullCode() {
        assertThat(service.getRoom(null)).isNull();
    }

    @Test
    void createRoom_usesResolvedHostNameAndMinimumPlayerLimit() {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setHostName("Uno Host");
        request.setMaxPlayers(1);

        RoomState room = service.createRoom("host-client", request);

        assertThat(room.getMaxPlayers()).isEqualTo(2);
        assertThat(room.getParticipants()).singleElement().extracting(RoomState.RoomParticipant::getName).isEqualTo("Uno Host");
    }

    @Test
    void createRoom_usesDefaultsWhenPayloadIsNullAndClampsHighPlayerCount() {
        RoomState defaultRoom = service.createRoom("host-client", null);
        assertThat(defaultRoom.getParticipants()).singleElement().extracting(RoomState.RoomParticipant::getName).isEqualTo("Host");
        assertThat(defaultRoom.getMaxPlayers()).isEqualTo(6);

        CreateRoomRequest highPlayerRequest = new CreateRoomRequest();
        highPlayerRequest.setMaxPlayers(99);
        RoomState clampedRoom = service.createRoom("host-client-2", highPlayerRequest);
        assertThat(clampedRoom.getMaxPlayers()).isEqualTo(6);
    }

    @Test
    void createRoom_usesDefaultsWhenOptionalFieldsAreOmitted() {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());

        assertThat(room.getMaxPlayers()).isEqualTo(6);
        assertThat(room.getParticipants()).singleElement().extracting(RoomState.RoomParticipant::getName).isEqualTo("Host");
    }

    @Test
    void joinRoom_rejectsMissingRoom() {
        RoomActionResult<RoomState> result = service.joinRoom("guest-client", joinRequest("missing", "Guest"));

        assertThat(result.isOk()).isFalse();
        assertThat(result.getError()).isEqualTo("Room not found. Check the code and try again.");
    }

    @Test
    void joinRoom_returnsExistingRoomWhenClientAlreadyJoined() {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());
        service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "Guest"));

        RoomActionResult<RoomState> result = service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "Another Guest"));

        assertThat(result.isOk()).isTrue();
        assertThat(result.getRoom()).isSameAs(room);
        assertThat(room.getParticipants()).hasSize(2);
    }

    @Test
    void joinRoom_rejectsFullRoomAndUsesDefaultGuestName() {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setMaxPlayers(2);
        RoomState room = service.createRoom("host-client", request);

        RoomActionResult<RoomState> joined = service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "   "));
        assertThat(joined.isOk()).isTrue();
        assertThat(room.getParticipants()).last().extracting(RoomState.RoomParticipant::getName).isEqualTo("Guest 1");

        RoomActionResult<RoomState> full = service.joinRoom("late-client", joinRequest(room.getRoomCode(), "Late"));
        assertThat(full.isOk()).isFalse();
        assertThat(full.getError()).isEqualTo("Room is full.");
    }

    @Test
    void joinRoom_rejectsMissingHostAndStartedRoom() {
        RoomState missingHostRoom = service.createRoom("host-client", new CreateRoomRequest());
        missingHostRoom.setHostClientId(" ");

        RoomActionResult<RoomState> missingHost = service.joinRoom("guest-client", joinRequest(missingHostRoom.getRoomCode(), "Guest"));
        assertThat(missingHost.isOk()).isFalse();
        assertThat(missingHost.getError()).isEqualTo("Room not found. Check the code and try again.");

        RoomState startedRoom = service.createRoom("host-client-2", new CreateRoomRequest());
        startedRoom.setStatus("playing");

        RoomActionResult<RoomState> started = service.joinRoom("guest-client", joinRequest(startedRoom.getRoomCode(), "Guest"));
        assertThat(started.isOk()).isFalse();
        assertThat(started.getError()).isEqualTo("Game already started. Cannot join now.");
    }

    @Test
    void joinRoom_rejectsNullHostIdAndMissingRoomCodePayload() {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());
        room.setHostClientId(null);

        RoomActionResult<RoomState> nullHost = service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "Guest"));
        assertThat(nullHost.isOk()).isFalse();
        assertThat(nullHost.getError()).isEqualTo("Room not found. Check the code and try again.");

        RoomScopedPayload.JoinRoomRequest missingRoom = new RoomScopedPayload.JoinRoomRequest();
        missingRoom.setPlayerName("Guest");

        RoomActionResult<RoomState> missingRoomCode = service.joinRoom("guest-client", missingRoom);
        assertThat(missingRoomCode.isOk()).isFalse();
        assertThat(missingRoomCode.getError()).isEqualTo("Room not found. Check the code and try again.");
    }

    @Test
    void joinRoom_returnsMissingRoomErrorForNullPayloadAndAcceptsRoomIdBasedJoin() {
        assertThat(service.joinRoom("guest-client", null).isOk()).isFalse();

        RoomState room = service.createRoom("host-client", new CreateRoomRequest());
        RoomScopedPayload.JoinRoomRequest request = new RoomScopedPayload.JoinRoomRequest();
        request.setRoomId(room.getRoomCode().toLowerCase());
        request.setPlayerName("Guest");

        RoomActionResult<RoomState> result = service.joinRoom("guest-client", request);

        assertThat(result.isOk()).isTrue();
        assertThat(result.getRoom()).isSameAs(room);
    }

    @Test
    void joinRoom_acceptsNullPayloadWhenRoomIsRegisteredUnderEmptyCode() throws Exception {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());
        registerRoomUnderCode(room, "");

        RoomActionResult<RoomState> result = service.joinRoom("guest-client", null);

        assertThat(result.isOk()).isTrue();
        assertThat(result.getRoom()).isSameAs(room);
        assertThat(room.getParticipants()).hasSize(2);
        assertThat(room.getParticipants()).last().extracting(RoomState.RoomParticipant::getName).isEqualTo("Guest 1");
    }

    @Test
    void updateSettings_requiresHost() {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());
        UpdateSettingsPayload payload = new UpdateSettingsPayload();
        payload.setRoomCode(room.getRoomCode());
        payload.setSettings(new RoomState.GameSettings());

        assertThat(service.updateSettings("guest-client", payload)).isNull();
    }

    @Test
    void updateSettings_updatesRoomForHost() {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());
        room.setSystemMessage("stale");
        UpdateSettingsPayload payload = new UpdateSettingsPayload();
        payload.setRoomCode(room.getRoomCode());
        RoomState.GameSettings settings = new RoomState.GameSettings();
        settings.setTurnSeconds(45);
        payload.setSettings(settings);

        RoomState updated = service.updateSettings("host-client", payload);

        assertThat(updated).isSameAs(room);
        assertThat(updated.getSettings()).isSameAs(settings);
        assertThat(updated.getSystemMessage()).isNull();
    }

    @Test
    void updateSettings_returnsNullForMissingInputsOrUnknownRoom() {
        assertThat(service.updateSettings("host-client", null)).isNull();

        UpdateSettingsPayload missingSettings = new UpdateSettingsPayload();
        missingSettings.setRoomCode("ROOM1");
        assertThat(service.updateSettings("host-client", missingSettings)).isNull();

        UpdateSettingsPayload unknownRoom = new UpdateSettingsPayload();
        unknownRoom.setRoomCode("ROOM1");
        unknownRoom.setSettings(new RoomState.GameSettings());
        assertThat(service.updateSettings("host-client", unknownRoom)).isNull();
    }

    @Test
    void publishState_marksRoomFinishedWhenPhaseFinished() {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());
        room.setSystemMessage("old");

        RoomState.BroadcastGameState gameState = new RoomState.BroadcastGameState();
        gameState.setPhase("finished");
        RoomState.GameSettings settings = new RoomState.GameSettings();
        settings.setStartingHandSize(5);
        gameState.setSettings(settings);

        PublishStatePayload payload = new PublishStatePayload();
        payload.setRoomCode(room.getRoomCode());
        payload.setGameState(gameState);

        RoomState updated = service.publishState("host-client", payload);

        assertThat(updated).isSameAs(room);
        assertThat(updated.getStatus()).isEqualTo("finished");
        assertThat(updated.getSettings()).isSameAs(settings);
        assertThat(updated.getSystemMessage()).isNull();
    }

    @Test
    void publishState_marksRoomPlayingWhenPhaseIsNotFinishedAndPreservesSettingsWhenMissing() {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());
        RoomState.GameSettings existingSettings = new RoomState.GameSettings();
        existingSettings.setStartingHandSize(9);
        room.setSettings(existingSettings);

        RoomState.BroadcastGameState gameState = new RoomState.BroadcastGameState();
        gameState.setPhase("playing");

        PublishStatePayload payload = new PublishStatePayload();
        payload.setRoomCode(room.getRoomCode());
        payload.setGameState(gameState);

        RoomState updated = service.publishState("host-client", payload);

        assertThat(updated).isSameAs(room);
        assertThat(updated.getStatus()).isEqualTo("playing");
        assertThat(updated.getSettings()).isSameAs(gameState.getSettings());
        assertThat(updated.getSettings()).isNotSameAs(existingSettings);
    }

    @Test
    void publishState_returnsNullForMissingInputsUnknownRoomOrNonHost() {
        assertThat(service.publishState("host-client", null)).isNull();

        PublishStatePayload missingGameState = new PublishStatePayload();
        missingGameState.setRoomCode("ROOM1");
        assertThat(service.publishState("host-client", missingGameState)).isNull();

        PublishStatePayload unknownRoom = new PublishStatePayload();
        unknownRoom.setRoomCode("ROOM1");
        unknownRoom.setGameState(new RoomState.BroadcastGameState());
        assertThat(service.publishState("host-client", unknownRoom)).isNull();

        RoomState room = service.createRoom("host-client", new CreateRoomRequest());
        PublishStatePayload nonHost = new PublishStatePayload();
        nonHost.setRoomCode(room.getRoomCode());
        nonHost.setGameState(new RoomState.BroadcastGameState());
        assertThat(service.publishState("guest-client", nonHost)).isNull();
    }

    @Test
    void publishState_keepsExistingSettingsWhenBroadcastSettingsAreNull() {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());
        RoomState.GameSettings existing = room.getSettings();
        RoomState.BroadcastGameState gameState = new RoomState.BroadcastGameState();
        gameState.setSettings(null);
        gameState.setPhase("playing");

        PublishStatePayload payload = new PublishStatePayload();
        payload.setRoomCode(room.getRoomCode());
        payload.setGameState(gameState);

        RoomState updated = service.publishState("host-client", payload);

        assertThat(updated).isSameAs(room);
        assertThat(updated.getSettings()).isSameAs(existing);
    }

    @Test
    void submitAction_recordsPendingActionForGuest() {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());
        service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "Guest"));
        room.setStatus("playing");

        SubmitActionPayload payload = new SubmitActionPayload();
        payload.setRoomCode(room.getRoomCode());
        payload.setKind("play_card");
        payload.setCardId("card-1");
        payload.setChosenColor("blue");

        RoomState updated = service.submitAction("guest-client", payload);

        assertThat(updated).isSameAs(room);
        assertThat(updated.getPendingAction()).isNotNull();
        assertThat(updated.getPendingAction().getActionId()).isEqualTo(1L);
        assertThat(updated.getPendingAction().getPlayerId()).isEqualTo("guest-player-2");
        assertThat(updated.getPendingAction().getKind()).isEqualTo("play_card");
        assertThat(updated.getPendingAction().getCardId()).isEqualTo("card-1");
        assertThat(updated.getPendingAction().getChosenColor()).isEqualTo("blue");
    }

    @Test
    void submitAction_rejectsBlankKindAndHostRequests() {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());
        service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "Guest"));
        room.setStatus("playing");

        SubmitActionPayload blankKind = new SubmitActionPayload();
        blankKind.setRoomCode(room.getRoomCode());
        blankKind.setKind("   ");

        SubmitActionPayload hostPayload = new SubmitActionPayload();
        hostPayload.setRoomCode(room.getRoomCode());
        hostPayload.setKind("draw_card");

        assertThat(service.submitAction("guest-client", blankKind)).isNull();
        assertThat(service.submitAction("host-client", hostPayload)).isNull();
    }

    @Test
    void submitAction_returnsNullForMissingInputsUnknownRoomWrongStateOrUnknownPlayer() {
        assertThat(service.submitAction("guest-client", null)).isNull();

        SubmitActionPayload nullKind = new SubmitActionPayload();
        nullKind.setRoomCode("ROOM1");
        assertThat(service.submitAction("guest-client", nullKind)).isNull();

        SubmitActionPayload unknownRoom = new SubmitActionPayload();
        unknownRoom.setRoomCode("ROOM1");
        unknownRoom.setKind("draw_card");
        assertThat(service.submitAction("guest-client", unknownRoom)).isNull();

        RoomState room = service.createRoom("host-client", new CreateRoomRequest());
        service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "Guest"));

        SubmitActionPayload payload = new SubmitActionPayload();
        payload.setRoomCode(room.getRoomCode());
        payload.setKind("draw_card");

        assertThat(service.submitAction("guest-client", payload)).isNull();

        room.setStatus("playing");
        assertThat(service.submitAction("missing-client", payload)).isNull();
    }

    @Test
    void disconnect_finishesGameWhenTooFewPlayersRemain() {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());
        service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "Guest"));
        room.setStatus("playing");
        room.setPendingAction(new RoomState.PendingAction());

        RoomState updated = service.disconnect("guest-client", room.getRoomCode());

        assertThat(updated).isSameAs(room);
        assertThat(updated.getParticipants()).singleElement().extracting(RoomState.RoomParticipant::getClientId).isEqualTo("host-client");
        assertThat(updated.getStatus()).isEqualTo("finished");
        assertThat(updated.getPendingAction()).isNull();
        assertThat(updated.getSystemMessage()).isEqualTo("Not enough players remain to continue this match.");
    }

    @Test
    void disconnect_closesRoomWhenHostLeaves() {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());
        service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "Guest"));
        room.setStatus("playing");
        room.setGameState(new RoomState.BroadcastGameState());
        room.setPendingAction(new RoomState.PendingAction());

        RoomState updated = service.disconnect("host-client", room.getRoomCode());

        assertThat(updated).isSameAs(room);
        assertThat(updated.getHostClientId()).isNull();
        assertThat(updated.getStatus()).isEqualTo("finished");
        assertThat(updated.getGameState()).isNull();
        assertThat(updated.getPendingAction()).isNull();
        assertThat(updated.getSystemMessage()).isEqualTo("The host disconnected, so this room has closed.");
    }

    @Test
    void disconnect_removesRoomWhenLastParticipantLeaves() {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());

        RoomState updated = service.disconnect("host-client", room.getRoomCode());

        assertThat(updated).isNull();
        assertThat(service.getRoom(room.getRoomCode())).isNull();
    }

    @Test
    void disconnect_returnsNullForUnknownRoomAndLeavesWaitingRoomOpen() {
        assertThat(service.disconnect("guest-client", "missing")).isNull();

        RoomState room = service.createRoom("host-client", new CreateRoomRequest());
        service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "Guest"));

        RoomState updated = service.disconnect("guest-client", room.getRoomCode());

        assertThat(updated).isSameAs(room);
        assertThat(updated.getStatus()).isEqualTo("waiting");
        assertThat(updated.getSystemMessage()).isNull();
    }

    @Test
    void disconnect_leavesPlayingRoomRunningWhenEnoughPlayersRemain() {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());
        service.joinRoom("guest-1", joinRequest(room.getRoomCode(), "Guest 1"));
        service.joinRoom("guest-2", joinRequest(room.getRoomCode(), "Guest 2"));
        room.setStatus("playing");

        RoomState updated = service.disconnect("guest-2", room.getRoomCode());

        assertThat(updated).isSameAs(room);
        assertThat(updated.getParticipants()).hasSize(2);
        assertThat(updated.getStatus()).isEqualTo("playing");
        assertThat(updated.getSystemMessage()).isNull();
    }

    @Test
    void roomCodeOf_returnsRoomCodeOrNull() {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());

        assertThat(service.roomCodeOf(room)).isEqualTo(room.getRoomCode());
        assertThat(service.roomCodeOf(null)).isNull();
    }

    private RoomScopedPayload.JoinRoomRequest joinRequest(String roomCode, String playerName) {
        RoomScopedPayload.JoinRoomRequest request = new RoomScopedPayload.JoinRoomRequest();
        request.setRoomCode(roomCode);
        request.setPlayerName(playerName);
        return request;
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

