package cmpe195.group1.minigameplatform.games.knockout.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class PuckState {
    private String id;
    private String player;
    private double x;
    private double y;
    private boolean active;
}