package cmpe195.group1.minigameplatform.games.uno.payload;

import cmpe195.group1.minigameplatform.games.uno.model.RoomState;
import cmpe195.group1.minigameplatform.multiplayer.payload.RoomScopedPayload;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class UpdateSettingsPayload extends RoomScopedPayload {
    private RoomState.GameSettings settings;

}

