package cmpe195.group1.minigameplatform.multiplayer.payload;

public class RoomServerMessage<T> {
    private String type;
    private T roomState;
    private String error;

    public RoomServerMessage() {
    }

    public RoomServerMessage(String type, T roomState, String error) {
        this.type = type;
        this.roomState = roomState;
        this.error = error;
    }

    public static <T> RoomServerMessage<T> roomState(T roomState) {
        return new RoomServerMessage<>("ROOM_STATE", roomState, null);
    }

    public static <T> RoomServerMessage<T> error(String error) {
        return new RoomServerMessage<>("ERROR", null, error);
    }

    public static <T> RoomServerMessage<T> joinError(String error) {
        return new RoomServerMessage<>("JOIN_ERROR", null, error);
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public T getRoomState() {
        return roomState;
    }

    public void setRoomState(T roomState) {
        this.roomState = roomState;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }
}
