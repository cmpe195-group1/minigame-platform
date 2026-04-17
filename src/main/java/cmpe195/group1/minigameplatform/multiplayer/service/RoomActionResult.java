package cmpe195.group1.minigameplatform.multiplayer.service;

public class RoomActionResult<R> {
    private final R room;
    private final String error;

    private RoomActionResult(R room, String error) {
        this.room = room;
        this.error = error;
    }

    public static <R> RoomActionResult<R> ok(R room) {
        return new RoomActionResult<>(room, null);
    }

    public static <R> RoomActionResult<R> error(String error) {
        return new RoomActionResult<>(null, error);
    }

    public boolean isOk() {
        return error == null;
    }

    public R getRoom() {
        return room;
    }

    public String getError() {
        return error;
    }
}
