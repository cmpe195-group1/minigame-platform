package cmpe195.group1.minigameplatform.games.archery.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@AllArgsConstructor
@Setter
@Getter
public class ArcheryArrowScore {
    private int round;
    private int score;
    private double dist;


}
