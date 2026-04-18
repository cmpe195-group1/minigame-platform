package cmpe195.group1.minigameplatform.multiplayer.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RoomActionResultTest {

    @Test
    void okResult_containsRoomAndNoError() {
        RoomActionResult<String> result = RoomActionResult.ok("room-1");

        assertThat(result.isOk()).isTrue();
        assertThat(result.getRoom()).isEqualTo("room-1");
        assertThat(result.getError()).isNull();
    }

    @Test
    void errorResult_containsErrorAndNoRoom() {
        RoomActionResult<String> result = RoomActionResult.error("not allowed");

        assertThat(result.isOk()).isFalse();
        assertThat(result.getRoom()).isNull();
        assertThat(result.getError()).isEqualTo("not allowed");
    }
}

