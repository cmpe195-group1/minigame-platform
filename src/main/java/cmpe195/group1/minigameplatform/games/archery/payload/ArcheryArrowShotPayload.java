package cmpe195.group1.minigameplatform.games.archery.payload;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class ArcheryArrowShotPayload {
    private String roomId;
    private Integer score;
    private Double dist;
    private Double impactX;
    private Double impactY;
}
