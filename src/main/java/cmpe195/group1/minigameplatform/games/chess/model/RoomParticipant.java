package cmpe195.group1.minigameplatform.games.chess.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@AllArgsConstructor
@Setter
@Getter
public class RoomParticipant {
    private int playerId;
    private String name;
    private String clientId;
    private String pieceColor;
}
