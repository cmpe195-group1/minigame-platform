package cmpe195.group1.minigameplatform.games.chess.model;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Setter
@Getter
@NoArgsConstructor
public class RoomState {
    private String roomCode;
    private String hostClientId;
    private int maxPlayers = 2;
    private String transport = "websocket";
    private List<RoomParticipant> participants = new ArrayList<>();
    private String status = "waiting";
    private ChessGameState gameState;
    private String winner;
    private int moveCount;
}
