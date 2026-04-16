package cmpe195.group1.minigameplatform.games.archery.backend.model;

public class ArcheryArrowScore {
    private int round;
    private int score;
    private double dist;

    public ArcheryArrowScore() {
    }

    public ArcheryArrowScore(int round, int score, double dist) {
        this.round = round;
        this.score = score;
        this.dist = dist;
    }

    public int getRound() {
        return round;
    }

    public void setRound(int round) {
        this.round = round;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public double getDist() {
        return dist;
    }

    public void setDist(double dist) {
        this.dist = dist;
    }
}
