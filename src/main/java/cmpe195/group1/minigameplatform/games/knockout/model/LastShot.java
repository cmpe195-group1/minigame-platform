package cmpe195.group1.minigameplatform.games.knockout.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class LastShot {
    private String puckId;
    private int turnNumber;
    private double impulseX;
    private double impulseY;
    private String shooterClientId;
}