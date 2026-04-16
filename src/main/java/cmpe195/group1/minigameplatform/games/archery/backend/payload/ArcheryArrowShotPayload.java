package cmpe195.group1.minigameplatform.games.archery.backend.payload;

public class ArcheryArrowShotPayload {
    private String roomId;
    private Integer score;
    private Double dist;

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
}
