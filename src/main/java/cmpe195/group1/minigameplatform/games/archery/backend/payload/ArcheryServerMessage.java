package cmpe195.group1.minigameplatform.games.archery.backend.payload;

import cmpe195.group1.minigameplatform.games.archery.backend.model.ArcheryRoomState;

public class ArcheryServerMessage {
    private String type;
    private ArcheryRoomState roomState;
    private String error;

    public ArcheryServerMessage() {
    }

    public ArcheryServerMessage(String type, ArcheryRoomState roomState, String error) {
        this.type = type;
        this.roomState = roomState;
        this.error = error;
    }

    public static ArcheryServerMessage roomState(ArcheryRoomState roomState) {
        return new ArcheryServerMessage("ROOM_STATE", roomState, null);
    }

    public static ArcheryServerMessage error(String error) {
        return new ArcheryServerMessage("ERROR", null, error);
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public ArcheryRoomState getRoomState() {
        return roomState;
    }

    public void setRoomState(ArcheryRoomState roomState) {
        this.roomState = roomState;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }
}
