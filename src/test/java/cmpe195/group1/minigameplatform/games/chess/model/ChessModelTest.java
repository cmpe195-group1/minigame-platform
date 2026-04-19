package cmpe195.group1.minigameplatform.games.chess.model;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ChessModelTest {

    @Test
    void chessPiece_toStringIncludesColorAndType() {
        ChessPiece piece = new ChessPiece("queen", "white", true);

        assertThat(piece.toString()).isEqualTo("white queen");
    }

    @Test
    void roomState_startsWithExpectedDefaults() {
        RoomState room = new RoomState();

        assertThat(room.getMaxPlayers()).isEqualTo(2);
        assertThat(room.getTransport()).isEqualTo("websocket");
        assertThat(room.getParticipants()).isEmpty();
        assertThat(room.getStatus()).isEqualTo("waiting");
        assertThat(room.getGameState()).isNull();
        assertThat(room.getWinner()).isNull();
        assertThat(room.getMoveCount()).isZero();
    }
}

