package cmpe195.group1.minigameplatform.games.checkers.backend.payload;

import cmpe195.group1.minigameplatform.games.checkers.backend.model.RoomState;

public class CheckersServerMessage {
    private String type;
    private RoomState roomState;
    private String error;

    public static CheckersServerMessage roomState(RoomState roomState) {
        CheckersServerMessage message = new CheckersServerMessage();
        message.setType("ROOM_STATE");
        message.setRoomState(roomState);
        return message;
    }

    public static CheckersServerMessage joinError(String error) {
        CheckersServerMessage message = new CheckersServerMessage();
        message.setType("JOIN_ERROR");
        message.setError(error);
        return message;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public RoomState getRoomState() {
        return roomState;
    }

    public void setRoomState(RoomState roomState) {
        this.roomState = roomState;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }
}
