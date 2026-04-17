package cmpe195.group1.minigameplatform.games.archery.backend.payload;

public class ArcheryArrowShotPayload {
    private String roomId;
    private Integer score;
    private Double dist;
    private Double impactX;
    private Double impactY;

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public Integer getScore() {
        return score;
    }

    public void setScore(Integer score) {
        this.score = score;
    }

    public Double getDist() {
        return dist;
    }

    public void setDist(Double dist) {
        this.dist = dist;
    }

    public Double getImpactX() {
        return impactX;
    }

    public void setImpactX(Double impactX) {
        this.impactX = impactX;
    }

    public Double getImpactY() {
        return impactY;
    }

    public void setImpactY(Double impactY) {
        this.impactY = impactY;
    }
}
