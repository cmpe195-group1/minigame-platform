package cmpe195.group1.minigameplatform.games.sudoku.backend.model;

public class PlayerScore {
    private int id;
    private String name;
    private String color;
    private String colorName;
    private int score;

    public PlayerScore() {
    }

    public PlayerScore(int id, String name, String color, String colorName, int score) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.colorName = colorName;
        this.score = score;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public String getColorName() {
        return colorName;
    }

    public void setColorName(String colorName) {
        this.colorName = colorName;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }
}
