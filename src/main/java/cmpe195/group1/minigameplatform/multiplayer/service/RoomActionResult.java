package cmpe195.group1.minigameplatform.multiplayer.service;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor(access = AccessLevel.PRIVATE)
public class RoomActionResult<R> {
    private final R room;
    private final String error;

    public static <R> RoomActionResult<R> ok(R room) {
        return new RoomActionResult<>(room, null);
    }

    public static <R> RoomActionResult<R> error(String error) {
        return new RoomActionResult<>(null, error);
    }

    public boolean isOk() {
        return error == null;
    }
}
