package cmpe195.group1.minigameplatform.multiplayer.websocket;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RoomTopicsTest {

    @Test
    void clientTopic_usesExpectedConvention() {
        assertThat(RoomTopics.clientTopic("uno", "client-7"))
                .isEqualTo("/topic/uno/client/client-7");
    }

    @Test
    void roomTopic_usesExpectedConvention() {
        assertThat(RoomTopics.roomTopic("checkers", "ROOM1"))
                .isEqualTo("/topic/checkers/room/ROOM1");
    }
}

