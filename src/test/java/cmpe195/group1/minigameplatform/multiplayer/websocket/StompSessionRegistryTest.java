package cmpe195.group1.minigameplatform.multiplayer.websocket;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class StompSessionRegistryTest {

    @Test
    void bindSetClearAndRemove_manageSessionState() {
        StompSessionRegistry registry = new StompSessionRegistry();

        registry.bindClient("session-1", "client-1");
        registry.setRoomCode("session-1", "ROOM1");

        assertThat(registry.getClientToken("session-1")).isEqualTo("client-1");

        StompSessionRegistry.SessionInfo info = registry.remove("session-1");
        assertThat(info.getClientToken()).isEqualTo("client-1");
        assertThat(info.getRoomCode()).isEqualTo("ROOM1");
        assertThat(registry.getClientToken("session-1")).isNull();
    }

    @Test
    void clearRoomCode_removesOnlyRoomAssociation() {
        StompSessionRegistry registry = new StompSessionRegistry();
        registry.bindClient("session-2", "client-2");
        registry.setRoomCode("session-2", "ROOM2");

        registry.clearRoomCode("session-2");

        StompSessionRegistry.SessionInfo info = registry.remove("session-2");
        assertThat(info.getClientToken()).isEqualTo("client-2");
        assertThat(info.getRoomCode()).isNull();
    }

    @Test
    void unknownSessionOperations_areNoOps() {
        StompSessionRegistry registry = new StompSessionRegistry();

        registry.setRoomCode("missing", "ROOM");
        registry.clearRoomCode("missing");

        assertThat(registry.getClientToken("missing")).isNull();
        assertThat(registry.remove("missing")).isNull();
    }
}

