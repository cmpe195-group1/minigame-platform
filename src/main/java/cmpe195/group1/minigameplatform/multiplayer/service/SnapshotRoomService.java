package cmpe195.group1.minigameplatform.multiplayer.service;

import cmpe195.group1.minigameplatform.multiplayer.payload.CreateRoomRequest;
import cmpe195.group1.minigameplatform.multiplayer.payload.RoomScopedPayload;

public interface SnapshotRoomService<R> {
    R createRoom(String clientId, CreateRoomRequest payload);

    RoomActionResult<R> joinRoom(String clientId, RoomScopedPayload.JoinRoomRequest payload);

    R disconnect(String clientId, String roomCode);

    String roomCodeOf(R room);
}
