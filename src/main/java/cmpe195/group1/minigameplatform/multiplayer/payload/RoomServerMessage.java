package cmpe195.group1.minigameplatform.multiplayer.payload;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RoomServerMessage<T> {
    private String type;
    private T roomState;
    private String error;

    public static <T> RoomServerMessage<T> roomState(T roomState) {
        return new RoomServerMessage<>("ROOM_STATE", roomState, null);
    }

    public static <T> RoomServerMessage<T> error(String error) {
        return new RoomServerMessage<>("ERROR", null, error);
    }

    public static <T> RoomServerMessage<T> joinError(String error) {
        return new RoomServerMessage<>("JOIN_ERROR", null, error);
    }
}
