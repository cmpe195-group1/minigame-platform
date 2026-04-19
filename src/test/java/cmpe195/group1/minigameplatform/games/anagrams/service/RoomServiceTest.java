package cmpe195.group1.minigameplatform.games.anagrams.service;

import cmpe195.group1.minigameplatform.games.anagrams.model.RoomState;
import cmpe195.group1.minigameplatform.games.anagrams.payload.PublishStatePayload;
import cmpe195.group1.minigameplatform.games.anagrams.payload.SubmitWordPayload;
import cmpe195.group1.minigameplatform.games.anagrams.payload.UpdateSettingsPayload;
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
    void createRoom_initializesLobbyAndClampsPlayerCount() {
        CreateRoomRequest request = createRequest("Alice", 99);

        RoomState room = service.createRoom("host-client", request);

        assertThat(room.getRoomCode()).hasSize(6);
        assertThat(room.getHostClientId()).isEqualTo("host-client");
        assertThat(room.getMaxPlayers()).isEqualTo(6);
        assertThat(room.getParticipants())
            .singleElement()
            .extracting(RoomState.RoomParticipant::getPlayerId, RoomState.RoomParticipant::getName, RoomState.RoomParticipant::getClientId)
            .containsExactly("host-player", "Alice", "host-client");
        assertThat(room.getStatus()).isEqualTo("waiting");
        assertThat(service.getRoom(room.getRoomCode().toLowerCase())).isSameAs(room);
    }

    @Test
    void getRoom_returnsNullForNullCode() {
        assertThat(service.getRoom(null)).isNull();
    }

    @Test
    void createRoom_usesDefaultHostAndMinimumPlayerLimit() {
        RoomState room = service.createRoom("host-client", createRequest("   ", 1));

        assertThat(room.getMaxPlayers()).isEqualTo(2);
        assertThat(room.getParticipants()).singleElement().extracting(RoomState.RoomParticipant::getName).isEqualTo("Host");
    }

    @Test
    void createRoom_usesDefaultsWhenPayloadIsNull() {
        RoomState room = service.createRoom("host-client", null);

        assertThat(room.getMaxPlayers()).isEqualTo(6);
        assertThat(room.getParticipants()).singleElement().extracting(RoomState.RoomParticipant::getName).isEqualTo("Host");
    }

    @Test
    void createRoom_usesDefaultsWhenOptionalFieldsAreOmitted() {
        RoomState room = service.createRoom("host-client", new CreateRoomRequest());

        assertThat(room.getMaxPlayers()).isEqualTo(6);
        assertThat(room.getParticipants()).singleElement().extracting(RoomState.RoomParticipant::getName).isEqualTo("Host");
    }

    @Test
    void joinRoom_rejectsDuplicateNamesIgnoringCase() {
        RoomState room = service.createRoom("host-client", createRequest("Host", 4));
        RoomScopedPayload.JoinRoomRequest joinRequest = joinRequest(room.getRoomCode(), "guest-client", " host ");

        RoomActionResult<RoomState> result = service.joinRoom("guest-client", joinRequest);

        assertThat(result.isOk()).isFalse();
        assertThat(result.getError()).isEqualTo("Player name already taken in this lobby.");
    }

    @Test
    void joinRoom_returnsExistingRoomWhenClientAlreadyJoined() {
        RoomState room = service.createRoom("host-client", createRequest("Host", 4));
        service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "guest-client", "Guest"));

        RoomActionResult<RoomState> result = service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "guest-client", "Another Name"));

        assertThat(result.isOk()).isTrue();
        assertThat(result.getRoom()).isSameAs(room);
        assertThat(room.getParticipants()).hasSize(2);
    }

    @Test
    void joinRoom_rejectsFullRoom() {
        RoomState room = service.createRoom("host-client", createRequest("Host", 2));
        service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "guest-client", "Guest"));

        RoomActionResult<RoomState> result = service.joinRoom("late-client", joinRequest(room.getRoomCode(), "late-client", "Late Guest"));

        assertThat(result.isOk()).isFalse();
        assertThat(result.getError()).isEqualTo("Room is full.");
    }

    @Test
    void joinRoom_rejectsStartedRoomAndUsesDefaultGuestName() {
        RoomState room = service.createRoom("host-client", createRequest("Host", 4));

        RoomActionResult<RoomState> joined = service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "guest-client", "   "));

        assertThat(joined.isOk()).isTrue();
        assertThat(room.getParticipants()).last().extracting(RoomState.RoomParticipant::getName).isEqualTo("Guest 1");

        room.setStatus("playing");
        RoomActionResult<RoomState> started = service.joinRoom("late-client", joinRequest(room.getRoomCode(), "late-client", "Late"));

        assertThat(started.isOk()).isFalse();
        assertThat(started.getError()).isEqualTo("Game already started. Cannot join now.");
    }

    @Test
    void joinRoom_rejectsRoomWhoseHostHasDisconnected() {
        RoomState room = service.createRoom("host-client", createRequest("Host", 4));
        room.setHostClientId(" ");

        RoomActionResult<RoomState> result = service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "guest-client", "Guest"));

        assertThat(result.isOk()).isFalse();
        assertThat(result.getError()).isEqualTo("Room not found. Check the code and try again.");
    }

    @Test
    void joinRoom_rejectsRoomWithNullHostIdAndMissingRoomCodePayload() {
        RoomState room = service.createRoom("host-client", createRequest("Host", 4));
        room.setHostClientId(null);

        RoomActionResult<RoomState> nullHost = service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "guest-client", "Guest"));
        assertThat(nullHost.isOk()).isFalse();
        assertThat(nullHost.getError()).isEqualTo("Room not found. Check the code and try again.");

        RoomScopedPayload.JoinRoomRequest missingRoom = new RoomScopedPayload.JoinRoomRequest();
        missingRoom.setClientToken("guest-client");
        missingRoom.setPlayerName("Guest");

        RoomActionResult<RoomState> missingRoomCode = service.joinRoom("guest-client", missingRoom);
        assertThat(missingRoomCode.isOk()).isFalse();
        assertThat(missingRoomCode.getError()).isEqualTo("Room not found. Check the code and try again.");
    }

    @Test
    void joinRoom_ignoresNullExistingNamesWhenCheckingDuplicates() {
        RoomState room = service.createRoom("host-client", createRequest("Host", 4));
        room.getParticipants().getFirst().setName(null);

        RoomActionResult<RoomState> result = service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "guest-client", "Guest"));

        assertThat(result.isOk()).isTrue();
        assertThat(room.getParticipants()).hasSize(2);
    }

    @Test
    void joinRoom_returnsMissingRoomErrorForNullPayloadAndAcceptsRoomIdBasedJoin() {
        assertThat(service.joinRoom("guest-client", null).isOk()).isFalse();

        RoomState room = service.createRoom("host-client", createRequest("Host", 4));
        RoomScopedPayload.JoinRoomRequest request = new RoomScopedPayload.JoinRoomRequest();
        request.setRoomId(room.getRoomCode().toLowerCase());
        request.setClientToken("guest-client");
        request.setPlayerName("Guest");

        RoomActionResult<RoomState> result = service.joinRoom("guest-client", request);

        assertThat(result.isOk()).isTrue();
        assertThat(result.getRoom()).isSameAs(room);
    }

    @Test
    void joinRoom_acceptsNullPayloadWhenRoomIsRegisteredUnderEmptyCode() throws Exception {
        RoomState room = service.createRoom("host-client", createRequest("Host", 4));
        registerRoomUnderCode(room, "");

        RoomActionResult<RoomState> result = service.joinRoom("guest-client", null);

        assertThat(result.isOk()).isTrue();
        assertThat(result.getRoom()).isSameAs(room);
        assertThat(room.getParticipants()).hasSize(2);
        assertThat(room.getParticipants()).last().extracting(RoomState.RoomParticipant::getName).isEqualTo("Guest 1");
    }

    @Test
    void publishState_updatesSettingsStatusAndClearsTransientFields() {
        RoomState room = service.createRoom("host-client", createRequest("Host", 4));
        room.setSystemMessage("old");
        room.setPendingAction(new RoomState.PendingAction());

        RoomState.GameSettings settings = new RoomState.GameSettings();
        settings.setLetterCount(10);
        RoomState.BroadcastGameState gameState = new RoomState.BroadcastGameState();
        gameState.setPhase("playing");
        gameState.setSettings(settings);

        PublishStatePayload payload = new PublishStatePayload();
        payload.setRoomCode(room.getRoomCode());
        payload.setGameState(gameState);

        RoomState updated = service.publishState("host-client", payload);

        assertThat(updated).isSameAs(room);
        assertThat(updated.getGameState()).isSameAs(gameState);
        assertThat(updated.getSettings()).isSameAs(settings);
        assertThat(updated.getStatus()).isEqualTo("playing");
        assertThat(updated.getPendingAction()).isNull();
        assertThat(updated.getSystemMessage()).isNull();
    }

    @Test
    void publishState_keepsExistingSettingsAndReturnsWaitingForNonPlayingPhase() {
        RoomState room = service.createRoom("host-client", createRequest("Host", 4));
        RoomState.GameSettings existingSettings = new RoomState.GameSettings();
        existingSettings.setLetterCount(11);
        room.setSettings(existingSettings);

        RoomState.BroadcastGameState gameState = new RoomState.BroadcastGameState();
        gameState.setPhase("results");

        PublishStatePayload payload = new PublishStatePayload();
        payload.setRoomCode(room.getRoomCode());
        payload.setGameState(gameState);

        RoomState updated = service.publishState("host-client", payload);

        assertThat(updated).isSameAs(room);
        assertThat(updated.getStatus()).isEqualTo("waiting");
        assertThat(updated.getSettings()).isSameAs(gameState.getSettings());
        assertThat(updated.getSettings()).isNotSameAs(existingSettings);
    }

    @Test
    void submitWord_recordsPendingActionForGuestDuringPlay() {
        RoomState room = service.createRoom("host-client", createRequest("Host", 4));
        service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "guest-client", "Guest"));
        room.setStatus("playing");

        SubmitWordPayload payload = new SubmitWordPayload();
        payload.setRoomCode(room.getRoomCode());
        payload.setWord("planet");

        RoomState updated = service.submitWord("guest-client", payload);

        assertThat(updated).isSameAs(room);
        assertThat(updated.getPendingAction()).isNotNull();
        assertThat(updated.getPendingAction().getSubmissionId()).isEqualTo(1L);
        assertThat(updated.getPendingAction().getPlayerId()).isEqualTo("guest-player-2");
        assertThat(updated.getPendingAction().getActionType()).isEqualTo("submit_word");
        assertThat(updated.getPendingAction().getWord()).isEqualTo("planet");
    }

    @Test
    void endTurn_recordsPendingActionWithoutWord() {
        RoomState room = service.createRoom("host-client", createRequest("Host", 4));
        service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "guest-client", "Guest"));
        room.setStatus("playing");

        cmpe195.group1.minigameplatform.games.anagrams.payload.EndTurnPayload payload =
            new cmpe195.group1.minigameplatform.games.anagrams.payload.EndTurnPayload();
        payload.setRoomCode(room.getRoomCode());

        RoomState updated = service.endTurn("guest-client", payload);

        assertThat(updated).isSameAs(room);
        assertThat(updated.getPendingAction()).isNotNull();
        assertThat(updated.getPendingAction().getSubmissionId()).isEqualTo(1L);
        assertThat(updated.getPendingAction().getActionType()).isEqualTo("end_turn");
        assertThat(updated.getPendingAction().getWord()).isNull();
    }

    @Test
    void submitWord_returnsNullForMissingInputsWrongStateHostOrUnknownPlayer() {
        assertThat(service.submitWord("guest-client", null)).isNull();

        SubmitWordPayload unknownRoom = new SubmitWordPayload();
        unknownRoom.setRoomCode("ROOM1");
        unknownRoom.setWord("planet");
        assertThat(service.submitWord("guest-client", unknownRoom)).isNull();

        RoomState room = service.createRoom("host-client", createRequest("Host", 4));
        service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "guest-client", "Guest"));

        SubmitWordPayload payload = new SubmitWordPayload();
        payload.setRoomCode(room.getRoomCode());
        payload.setWord("planet");

        assertThat(service.submitWord("guest-client", payload)).isNull();

        room.setStatus("playing");
        assertThat(service.submitWord("host-client", payload)).isNull();
        assertThat(service.submitWord("missing-client", payload)).isNull();
    }

    @Test
    void endTurn_returnsNullForMissingInputsWrongStateHostOrUnknownPlayer() {
        assertThat(service.endTurn("guest-client", null)).isNull();

        cmpe195.group1.minigameplatform.games.anagrams.payload.EndTurnPayload unknownRoom =
            new cmpe195.group1.minigameplatform.games.anagrams.payload.EndTurnPayload();
        unknownRoom.setRoomCode("ROOM1");
        assertThat(service.endTurn("guest-client", unknownRoom)).isNull();

        RoomState room = service.createRoom("host-client", createRequest("Host", 4));
        service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "guest-client", "Guest"));

        cmpe195.group1.minigameplatform.games.anagrams.payload.EndTurnPayload payload =
            new cmpe195.group1.minigameplatform.games.anagrams.payload.EndTurnPayload();
        payload.setRoomCode(room.getRoomCode());

        assertThat(service.endTurn("guest-client", payload)).isNull();

        room.setStatus("playing");
        assertThat(service.endTurn("host-client", payload)).isNull();
        assertThat(service.endTurn("missing-client", payload)).isNull();
    }

    @Test
    void updateSettings_returnsNullForNonHost() {
        RoomState room = service.createRoom("host-client", createRequest("Host", 4));
        UpdateSettingsPayload payload = new UpdateSettingsPayload();
        payload.setRoomCode(room.getRoomCode());
        payload.setSettings(new RoomState.GameSettings());

        RoomState updated = service.updateSettings("guest-client", payload);

        assertThat(updated).isNull();
    }

    @Test
    void updateSettings_updatesRoomForHostAndClearsMessage() {
        RoomState room = service.createRoom("host-client", createRequest("Host", 4));
        room.setSystemMessage("stale");
        UpdateSettingsPayload payload = new UpdateSettingsPayload();
        payload.setRoomCode(room.getRoomCode());
        RoomState.GameSettings settings = new RoomState.GameSettings();
        settings.setTurnSeconds(60);
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
    void publishState_returnsNullForMissingInputsUnknownRoomOrNonHost() {
        assertThat(service.publishState("host-client", null)).isNull();

        PublishStatePayload missingGameState = new PublishStatePayload();
        missingGameState.setRoomCode("ROOM1");
        assertThat(service.publishState("host-client", missingGameState)).isNull();

        PublishStatePayload unknownRoom = new PublishStatePayload();
        unknownRoom.setRoomCode("ROOM1");
        unknownRoom.setGameState(new RoomState.BroadcastGameState());
        assertThat(service.publishState("host-client", unknownRoom)).isNull();

        RoomState room = service.createRoom("host-client", createRequest("Host", 4));
        PublishStatePayload nonHost = new PublishStatePayload();
        nonHost.setRoomCode(room.getRoomCode());
        nonHost.setGameState(new RoomState.BroadcastGameState());
        assertThat(service.publishState("guest-client", nonHost)).isNull();
    }

    @Test
    void publishState_keepsExistingSettingsWhenBroadcastSettingsAreNull() {
        RoomState room = service.createRoom("host-client", createRequest("Host", 4));
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
    void disconnect_marksRoomClosedWhenHostLeavesPlayersBehind() {
        RoomState room = service.createRoom("host-client", createRequest("Host", 4));
        service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "guest-client", "Guest"));
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
        RoomState room = service.createRoom("host-client", createRequest(null, 2));

        RoomState updated = service.disconnect("host-client", room.getRoomCode());

        assertThat(updated).isNull();
        assertThat(service.getRoom(room.getRoomCode())).isNull();
    }

    @Test
    void disconnect_setsRoomBackToWaitingWhenTooFewPlayersRemain() {
        RoomState room = service.createRoom("host-client", createRequest("Host", 4));
        service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "guest-client", "Guest"));
        room.setStatus("playing");
        room.setGameState(new RoomState.BroadcastGameState());

        RoomState updated = service.disconnect("guest-client", room.getRoomCode());

        assertThat(updated).isSameAs(room);
        assertThat(updated.getParticipants()).singleElement().extracting(RoomState.RoomParticipant::getClientId).isEqualTo("host-client");
        assertThat(updated.getStatus()).isEqualTo("waiting");
        assertThat(updated.getGameState()).isNull();
        assertThat(updated.getSystemMessage()).isEqualTo("Not enough players remain to continue this match.");
    }

    @Test
    void disconnect_returnsNullForUnknownRoomAndLeavesWaitingRoomOpen() {
        assertThat(service.disconnect("guest-client", "missing")).isNull();

        RoomState room = service.createRoom("host-client", createRequest("Host", 4));
        service.joinRoom("guest-client", joinRequest(room.getRoomCode(), "guest-client", "Guest"));

        RoomState updated = service.disconnect("guest-client", room.getRoomCode());

        assertThat(updated).isSameAs(room);
        assertThat(updated.getStatus()).isEqualTo("waiting");
        assertThat(updated.getSystemMessage()).isEqualTo("Not enough players remain to continue this match.");
    }

    @Test
    void disconnect_leavesRoomOpenWhenEnoughPlayersRemain() {
        RoomState room = service.createRoom("host-client", createRequest("Host", 4));
        service.joinRoom("guest-1", joinRequest(room.getRoomCode(), "guest-1", "Guest 1"));
        service.joinRoom("guest-2", joinRequest(room.getRoomCode(), "guest-2", "Guest 2"));
        room.setStatus("playing");

        RoomState updated = service.disconnect("guest-2", room.getRoomCode());

        assertThat(updated).isSameAs(room);
        assertThat(updated.getParticipants()).hasSize(2);
        assertThat(updated.getStatus()).isEqualTo("playing");
        assertThat(updated.getSystemMessage()).isNull();
    }

    @Test
    void roomCodeOf_returnsRoomCodeOrNull() {
        RoomState room = service.createRoom("host-client", createRequest("Host", 4));

        assertThat(service.roomCodeOf(room)).isEqualTo(room.getRoomCode());
        assertThat(service.roomCodeOf(null)).isNull();
    }

    private CreateRoomRequest createRequest(String playerName, Integer maxPlayers) {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setPlayerName(playerName);
        request.setMaxPlayers(maxPlayers);
        return request;
    }

    private RoomScopedPayload.JoinRoomRequest joinRequest(String roomCode, String clientToken, String playerName) {
        RoomScopedPayload.JoinRoomRequest request = new RoomScopedPayload.JoinRoomRequest();
        request.setRoomCode(roomCode);
        request.setClientToken(clientToken);
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

