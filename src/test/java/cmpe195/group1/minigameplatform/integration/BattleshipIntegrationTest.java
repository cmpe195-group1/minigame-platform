package cmpe195.group1.minigameplatform.integration;

import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.stomp.StompSession;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class BattleshipIntegrationTest extends AbstractGameWebSocketIntegrationSupport {

    @Test
    void basicGameplayFlow() throws Exception {
        String hostToken = uniqueToken("battleship-host");
        String guestToken = uniqueToken("battleship-guest");
        String roomId = uniqueRoomId("BATTLE");

        StompSession hostSession = connect();
        StompSession guestSession = connect();

        var hostClientMessages = subscribeClientTopic(hostSession, "battleship", hostToken);
        var guestClientMessages = subscribeClientTopic(guestSession, "battleship", guestToken);

        send(hostSession, "/app/battleship/send", Map.of(
            "type", "create_room",
            "clientToken", hostToken,
            "roomId", roomId
        ));

        var createResponse = awaitMessage(hostClientMessages);
        assertThat(text(createResponse, "type")).isEqualTo("room_created");
        assertThat(text(createResponse, "roomId")).isEqualTo(roomId);

        send(guestSession, "/app/battleship/send", Map.of(
            "type", "join",
            "clientToken", guestToken,
            "roomId", roomId
        ));

        var joinResponse = awaitMessage(hostClientMessages);
        assertThat(text(joinResponse, "type")).isEqualTo("join");
        assertThat(text(joinResponse, "roomId")).isEqualTo(roomId);

        send(guestSession, "/app/battleship/send", Map.of(
            "type", "attack",
            "roomId", roomId,
            "x", 3,
            "y", 4
        ));

        var attackResponse = awaitMessage(hostClientMessages);
        assertThat(text(attackResponse, "type")).isEqualTo("attack");
        assertThat(text(attackResponse, "roomId")).isEqualTo(roomId);
        assertThat(intValue(attackResponse, "x")).isEqualTo(3);
        assertThat(intValue(attackResponse, "y")).isEqualTo(4);
        assertThat(guestClientMessages).isEmpty();
    }
}


