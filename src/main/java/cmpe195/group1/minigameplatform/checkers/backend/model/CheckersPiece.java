package cmpe195.group1.minigameplatform.checkers.backend.model;

public class CheckersPiece {
    private String color;
    private boolean king;

    public CheckersPiece() {
    }

    public CheckersPiece(String color, boolean king) {
        this.color = color;
        this.king = king;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public boolean isKing() {
        return king;
    }

    public void setKing(boolean king) {
        this.king = king;
    }
}
