package cmpe195.group1.minigameplatform.integration;

import cmpe195.group1.minigameplatform.games.archery.payload.ArcheryArrowShotPayload;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.stomp.StompSession;

import static org.assertj.core.api.Assertions.assertThat;

class ArcheryIntegrationTest extends AbstractGameWebSocketIntegrationSupport {

    @Test
    void basicGameplayFlow() throws Exception {
        String hostToken = uniqueToken("archery-host");
        String guestToken = uniqueToken("archery-guest");

        StompSession hostSession = connect();
        StompSession guestSession = connect();

        var hostClientMessages = subscribeClientTopic(hostSession, "archery", hostToken);
        var guestClientMessages = subscribeClientTopic(guestSession, "archery", guestToken);

        send(hostSession, "/app/archery/create", createRoomRequest(hostToken, "Host"));
        var createdRoom = awaitRoomState(hostClientMessages);
        String roomId = extractRoomCode(createdRoom);

        assertThat(roomId).isNotBlank();

        var hostRoomMessages = subscribeRoomTopic(hostSession, "archery", roomId);

        send(guestSession, "/app/archery/join", joinRoomRequest(guestToken, roomId, "Guest"));
        var joinedRoom = awaitRoomState(guestClientMessages);
        var roomAfterJoin = awaitRoomState(hostRoomMessages);

        assertThat(list(joinedRoom.get("players"))).hasSize(2);
        assertThat(list(roomAfterJoin.get("players"))).hasSize(2);

        send(hostSession, "/app/archery/start", roomIdRequest(roomId));
        var startedRoom = awaitRoomState(hostRoomMessages);

        assertThat(text(startedRoom, "state")).isEqualTo("playing");
        assertThat(intValue(startedRoom, "currentSlot")).isEqualTo(0);

        ArcheryArrowShotPayload shotPayload = new ArcheryArrowShotPayload();
        shotPayload.setRoomId(roomId);
        shotPayload.setScore(8);
        shotPayload.setDist(12.5);
        shotPayload.setImpactX(2.0);
        shotPayload.setImpactY(-1.5);
        send(hostSession, "/app/archery/arrowShot", shotPayload);

        var roomAfterShot = awaitRoomState(hostRoomMessages);
        var lastShot = map(roomAfterShot.get("lastShot"));
        assertThat(intValue(roomAfterShot, "arrowsFired")).isEqualTo(1);
        assertThat(intValue(lastShot, "score")).isEqualTo(8);
        assertThat(intValue(lastShot, "shooterSlot")).isEqualTo(0);
    }
}


