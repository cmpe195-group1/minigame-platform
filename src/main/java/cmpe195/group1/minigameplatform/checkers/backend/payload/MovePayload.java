package cmpe195.group1.minigameplatform.checkers.backend.payload;

import cmpe195.group1.minigameplatform.checkers.backend.model.CheckersGameState;
import cmpe195.group1.minigameplatform.checkers.backend.model.CheckersPosition;

public class MovePayload {
    private String roomCode;
    private CheckersPosition from;
    private CheckersPosition to;
    private CheckersGameState resultingState;

    public String getRoomCode() {
        return roomCode;
    }

    public void setRoomCode(String roomCode) {
        this.roomCode = roomCode;
    }

    public CheckersPosition getFrom() {
        return from;
    }

    public void setFrom(CheckersPosition from) {
        this.from = from;
    }

    public CheckersPosition getTo() {
        return to;
    }

    public void setTo(CheckersPosition to) {
        this.to = to;
    }

    public CheckersGameState getResultingState() {
        return resultingState;
    }

    public void setResultingState(CheckersGameState resultingState) {
        this.resultingState = resultingState;
    }
}
