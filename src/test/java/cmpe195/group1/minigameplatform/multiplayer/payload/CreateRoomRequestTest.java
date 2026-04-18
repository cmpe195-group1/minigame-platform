package cmpe195.group1.minigameplatform.multiplayer.payload;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CreateRoomRequestTest {

    @Test
    void resolvePlayerName_prefersPlayerName() {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setPlayerName(" Player One ");
        request.setHostName("Host");

        assertThat(request.resolvePlayerName()).isEqualTo(" Player One ");
    }

    @Test
    void resolvePlayerName_fallsBackToHostName() {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setPlayerName("   ");
        request.setHostName("Host");

        assertThat(request.resolvePlayerName()).isEqualTo("Host");
    }

    @Test
    void resolvePlayerName_returnsNullWhenNoNameIsPresent() {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setPlayerName(null);
        request.setHostName(" ");

        assertThat(request.resolvePlayerName()).isNull();
    }
}

