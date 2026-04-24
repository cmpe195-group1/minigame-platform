package cmpe195.group1.minigameplatform.games.knockout.model;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class KnockoutGameState {
    private String currentPlayer;
    private String phase;
    private String winner;
    private int turnNumber;
    private List<PuckState> pucks = new ArrayList<>();
}