package cmpe195.group1.minigameplatform.checkers.backend.model;

public class CheckersPosition {
    private int x;
    private int y;

    public CheckersPosition() {
    }

    public CheckersPosition(int x, int y) {
        this.x = x;
        this.y = y;
    }

    public int getX() {
        return x;
    }

    public void setX(int x) {
        this.x = x;
    }

    public int getY() {
        return y;
    }

    public void setY(int y) {
        this.y = y;
    }
}
