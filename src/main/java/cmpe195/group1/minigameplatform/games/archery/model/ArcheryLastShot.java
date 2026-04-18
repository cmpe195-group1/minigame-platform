package cmpe195.group1.minigameplatform.games.archery.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@AllArgsConstructor
@Setter
@Getter
public class ArcheryLastShot {
    private int sequence;
    private int shooterSlot;
    private int score;
    private double dist;
    private double impactX;
    private double impactY;
}
