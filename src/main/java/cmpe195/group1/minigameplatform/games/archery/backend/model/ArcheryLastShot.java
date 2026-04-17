package cmpe195.group1.minigameplatform.games.archery.backend.model;

public class ArcheryLastShot {
    private int sequence;
    private int shooterSlot;
    private int score;
    private double dist;
    private double impactX;
    private double impactY;

    public ArcheryLastShot() {
    }

    public ArcheryLastShot(int sequence, int shooterSlot, int score, double dist, double impactX, double impactY) {
        this.sequence = sequence;
        this.shooterSlot = shooterSlot;
        this.score = score;
        this.dist = dist;
        this.impactX = impactX;
        this.impactY = impactY;
    }

    public int getSequence() {
        return sequence;
    }

    public void setSequence(int sequence) {
        this.sequence = sequence;
    }

    public int getShooterSlot() {
        return shooterSlot;
    }

    public void setShooterSlot(int shooterSlot) {
        this.shooterSlot = shooterSlot;
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

    public double getImpactX() {
        return impactX;
    }

    public void setImpactX(double impactX) {
        this.impactX = impactX;
    }

    public double getImpactY() {
        return impactY;
    }

    public void setImpactY(double impactY) {
        this.impactY = impactY;
    }
}
