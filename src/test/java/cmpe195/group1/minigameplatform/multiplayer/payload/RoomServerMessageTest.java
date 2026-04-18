package cmpe195.group1.minigameplatform.multiplayer.payload;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RoomServerMessageTest {

    @Test
    void roomStateFactory_populatesStateMessage() {
        RoomServerMessage<String> message = RoomServerMessage.roomState("room-state");

        assertThat(message.getType()).isEqualTo("ROOM_STATE");
        assertThat(message.getRoomState()).isEqualTo("room-state");
        assertThat(message.getError()).isNull();
    }

    @Test
    void errorFactories_populateExpectedMessageTypes() {
        RoomServerMessage<String> error = RoomServerMessage.error("boom");
        RoomServerMessage<String> joinError = RoomServerMessage.joinError("join failed");

        assertThat(error.getType()).isEqualTo("ERROR");
        assertThat(error.getRoomState()).isNull();
        assertThat(error.getError()).isEqualTo("boom");

        assertThat(joinError.getType()).isEqualTo("JOIN_ERROR");
        assertThat(joinError.getRoomState()).isNull();
        assertThat(joinError.getError()).isEqualTo("join failed");
    }

    @Test
    void noArgsConstructorAndSetters_allowManualPopulation() {
        RoomServerMessage<String> message = new RoomServerMessage<>();
        message.setType("CUSTOM");
        message.setRoomState("payload");
        message.setError("warning");

        assertThat(message.getType()).isEqualTo("CUSTOM");
        assertThat(message.getRoomState()).isEqualTo("payload");
        assertThat(message.getError()).isEqualTo("warning");
    }
}

