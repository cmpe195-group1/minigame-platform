package cmpe195.group1.minigameplatform.games.sudoku.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@AllArgsConstructor
@Setter
@Getter
public class RoomParticipant {
    private int playerId;
    private String name;
    private String color;
    private String colorName;
    private String clientId;


}
