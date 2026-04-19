package cmpe195.group1.minigameplatform.games.chess.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
public class ChessPiece {
    private String type;
    private String color;
    private boolean hasMoved;

    @Override
    public String toString() {
        return color + " " + type;
    }
}