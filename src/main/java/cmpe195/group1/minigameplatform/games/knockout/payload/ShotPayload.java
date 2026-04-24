package cmpe195.group1.minigameplatform.games.knockout.payload;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ShotPayload {
    private String roomCode;
    private int turnNumber;
    private String puckId;
    private double impulseX;
    private double impulseY;
}