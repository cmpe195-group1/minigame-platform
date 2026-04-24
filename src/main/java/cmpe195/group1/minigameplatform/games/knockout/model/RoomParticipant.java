package cmpe195.group1.minigameplatform.games.knockout.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class RoomParticipant {
    private int playerId;
    private String name;
    private String clientId;
    private String side;
}