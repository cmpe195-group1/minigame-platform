package cmpe195.group1.minigameplatform.multiplayer.payload;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RoomScopedPayloadTest {

    @Test
    void resolveRoomCode_prefersRoomCode() {
        RoomScopedPayload payload = new RoomScopedPayload();
        payload.setRoomCode(" room-123 ");
        payload.setRoomId("fallback-id");

        assertThat(payload.resolveRoomCode()).isEqualTo(" room-123 ");
    }

    @Test
    void resolveRoomCode_fallsBackToRoomId() {
        RoomScopedPayload payload = new RoomScopedPayload();
        payload.setRoomCode("   ");
        payload.setRoomId("room-id");

        assertThat(payload.resolveRoomCode()).isEqualTo("room-id");
    }

    @Test
    void resolveRoomCode_returnsNullWhenNoRoomIdentifierExists() {
        RoomScopedPayload payload = new RoomScopedPayload();
        payload.setRoomCode(null);
        payload.setRoomId("\t");

        assertThat(payload.resolveRoomCode()).isNull();
    }
}

