package cmpe195.group1.minigameplatform.integration;

import cmpe195.group1.minigameplatform.games.anagrams.model.RoomState;
import cmpe195.group1.minigameplatform.games.anagrams.payload.PublishStatePayload;
import cmpe195.group1.minigameplatform.games.anagrams.payload.SubmitWordPayload;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.stomp.StompSession;

import static org.assertj.core.api.Assertions.assertThat;

class AnagramsIntegrationTest extends AbstractGameWebSocketIntegrationSupport {

    @Test
    void basicGameplayFlow() throws Exception {
        String hostToken = uniqueToken("anagrams-host");
        String guestToken = uniqueToken("anagrams-guest");

        StompSession hostSession = connect();
        StompSession guestSession = connect();

        var hostClientMessages = subscribeClientTopic(hostSession, "anagrams", hostToken);
        var guestClientMessages = subscribeClientTopic(guestSession, "anagrams", guestToken);

        send(hostSession, "/app/anagrams/create", createRoomRequest(hostToken, "Host"));
        var createdRoom = awaitRoomState(hostClientMessages);
        String roomCode = extractRoomCode(createdRoom);

        assertThat(roomCode).isNotBlank();
        assertThat(list(createdRoom.get("participants"))).hasSize(1);

        var hostRoomMessages = subscribeRoomTopic(hostSession, "anagrams", roomCode);

        send(guestSession, "/app/anagrams/join", joinRoomRequest(guestToken, roomCode, "Guest"));
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
        send(hostSession, "/app/anagrams/state", publishStatePayload);

        var publishedRoom = awaitRoomState(hostRoomMessages);
        assertThat(text(publishedRoom, "status")).isEqualTo("playing");

        SubmitWordPayload submitWordPayload = new SubmitWordPayload();
        submitWordPayload.setRoomCode(roomCode);
        submitWordPayload.setWord("planet");
        send(guestSession, "/app/anagrams/submitWord", submitWordPayload);

        var roomAfterWord = awaitRoomState(hostRoomMessages);
        var pendingAction = map(roomAfterWord.get("pendingAction"));
        assertThat(text(pendingAction, "actionType")).isEqualTo("submit_word");
        assertThat(text(pendingAction, "word")).isEqualTo("planet");
    }
}


