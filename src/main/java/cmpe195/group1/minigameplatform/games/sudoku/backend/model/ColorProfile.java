package cmpe195.group1.minigameplatform.games.sudoku.backend.model;

public class ColorProfile {
    private final String color;
    private final String colorName;

    public ColorProfile(String color, String colorName) {
        this.color = color;
        this.colorName = colorName;
    }

    public String getColor() {
        return color;
    }

    public String getColorName() {
        return colorName;
    }
}
