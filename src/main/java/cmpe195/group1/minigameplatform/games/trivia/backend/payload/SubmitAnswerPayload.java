package cmpe195.group1.minigameplatform.games.trivia.backend.payload;

public class SubmitAnswerPayload {
    private String roomCode;
    private String roomId;
    private String answer;
    private boolean timedOut;

    public String getRoomCode() {
        return roomCode;
    }

    public void setRoomCode(String roomCode) {
        this.roomCode = roomCode;
    }

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }

    public boolean isTimedOut() {
        return timedOut;
    }

    public void setTimedOut(boolean timedOut) {
        this.timedOut = timedOut;
    }

    public String resolveRoomCode() {
        if (roomCode != null && !roomCode.isBlank()) {
            return roomCode;
        }
        if (roomId != null && !roomId.isBlank()) {
            return roomId;
        }
        return null;
    }
}

