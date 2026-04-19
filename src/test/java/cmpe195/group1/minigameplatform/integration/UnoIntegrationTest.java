package cmpe195.group1.minigameplatform.integration;

import cmpe195.group1.minigameplatform.games.uno.model.RoomState;
import cmpe195.group1.minigameplatform.games.uno.payload.PublishStatePayload;
import cmpe195.group1.minigameplatform.games.uno.payload.SubmitActionPayload;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.stomp.StompSession;

import static org.assertj.core.api.Assertions.assertThat;

class UnoIntegrationTest extends AbstractGameWebSocketIntegrationSupport {

    @Test
    void basicGameplayFlow() throws Exception {
        String hostToken = uniqueToken("uno-host");
        String guestToken = uniqueToken("uno-guest");

        StompSession hostSession = connect();
        StompSession guestSession = connect();

        var hostClientMessages = subscribeClientTopic(hostSession, "uno", hostToken);
        var guestClientMessages = subscribeClientTopic(guestSession, "uno", guestToken);

        send(hostSession, "/app/uno/create", createRoomRequest(hostToken, "Host"));
        var createdRoom = awaitRoomState(hostClientMessages);
        String roomCode = extractRoomCode(createdRoom);

        assertThat(roomCode).isNotBlank();
        assertThat(list(createdRoom.get("participants"))).hasSize(1);

        var hostRoomMessages = subscribeRoomTopic(hostSession, "uno", roomCode);

        send(guestSession, "/app/uno/join", joinRoomRequest(guestToken, roomCode, "Guest"));
        var joinedRoom = awaitRoomState(guestClientMessages);
        var roomAfterJoin = awaitRoomState(hostRoomMessages);

        assertThat(list(joinedRoom.get("participants"))).hasSize(2);
        assertThat(list(roomAfterJoin.get("participants"))).hasSize(2);

        RoomState.BroadcastGameState gameState = new RoomState.BroadcastGameState();
        gameState.setPhase("playing");
        gameState.setSettings(new RoomState.GameSettings());

        PublishStatePayload publishStatePayload = new PublishStatePayload();
        publishStatePayload.setRoomCode(roomCode);
        publishStatePayload.setGameState(gameState);
        send(hostSession, "/app/uno/state", publishStatePayload);

        var publishedRoom = awaitRoomState(hostRoomMessages);
        assertThat(text(publishedRoom, "status")).isEqualTo("playing");

        SubmitActionPayload submitActionPayload = new SubmitActionPayload();
        submitActionPayload.setRoomCode(roomCode);
        submitActionPayload.setKind("draw_card");
        send(guestSession, "/app/uno/action", submitActionPayload);

        var roomAfterAction = awaitRoomState(hostRoomMessages);
        var pendingAction = map(roomAfterAction.get("pendingAction"));
        assertThat(text(pendingAction, "kind")).isEqualTo("draw_card");
        assertThat(text(pendingAction, "playerId")).isNotBlank();
    }
}


