package cmpe195.group1.minigameplatform.games.sudoku.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@AllArgsConstructor
@Setter
@Getter
public class PlayerScore {
    private int id;
    private String name;
    private String color;
    private String colorName;
    private int score;
}
