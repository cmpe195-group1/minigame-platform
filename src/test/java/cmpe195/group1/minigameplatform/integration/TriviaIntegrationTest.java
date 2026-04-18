package cmpe195.group1.minigameplatform.integration;

import cmpe195.group1.minigameplatform.games.trivia.model.RoomState;
import cmpe195.group1.minigameplatform.games.trivia.payload.PublishStatePayload;
import cmpe195.group1.minigameplatform.games.trivia.payload.SubmitAnswerPayload;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.stomp.StompSession;

import static org.assertj.core.api.Assertions.assertThat;

class TriviaIntegrationTest extends AbstractGameWebSocketIntegrationSupport {

    @Test
    void basicGameplayFlow() throws Exception {
        String hostToken = uniqueToken("trivia-host");
        String guestToken = uniqueToken("trivia-guest");

        StompSession hostSession = connect();
        StompSession guestSession = connect();

        var hostClientMessages = subscribeClientTopic(hostSession, "trivia", hostToken);
        var guestClientMessages = subscribeClientTopic(guestSession, "trivia", guestToken);

        send(hostSession, "/app/trivia/create", createRoomRequest(hostToken, "Host"));
        var createdRoom = awaitRoomState(hostClientMessages);
        String roomCode = extractRoomCode(createdRoom);

        assertThat(roomCode).isNotBlank();
        assertThat(list(createdRoom.get("participants"))).hasSize(1);

        var hostRoomMessages = subscribeRoomTopic(hostSession, "trivia", roomCode);

        send(guestSession, "/app/trivia/join", joinRoomRequest(guestToken, roomCode, "Guest"));
        var joinedRoom = awaitRoomState(guestClientMessages);
        var roomAfterJoin = awaitRoomState(hostRoomMessages);

        assertThat(list(joinedRoom.get("participants"))).hasSize(2);
        assertThat(list(roomAfterJoin.get("participants"))).hasSize(2);

        RoomState.BroadcastGameState gameState = new RoomState.BroadcastGameState();
        gameState.setPhase("question");
        gameState.setSettings(new RoomState.GameSettings());

        PublishStatePayload publishStatePayload = new PublishStatePayload();
        publishStatePayload.setRoomCode(roomCode);
        publishStatePayload.setGameState(gameState);
        send(hostSession, "/app/trivia/state", publishStatePayload);

        var publishedRoom = awaitRoomState(hostRoomMessages);
        assertThat(text(publishedRoom, "status")).isEqualTo("playing");

        SubmitAnswerPayload submitAnswerPayload = new SubmitAnswerPayload();
        submitAnswerPayload.setRoomCode(roomCode);
        submitAnswerPayload.setAnswer("4");
        send(guestSession, "/app/trivia/submitAnswer", submitAnswerPayload);

        var roomAfterAnswer = awaitRoomState(hostRoomMessages);
        var pendingAnswer = map(roomAfterAnswer.get("pendingAnswer"));
        assertThat(text(pendingAnswer, "answer")).isEqualTo("4");
        assertThat(booleanValue(pendingAnswer, "timedOut")).isFalse();
    }
}


