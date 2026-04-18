package cmpe195.group1.minigameplatform.games.trivia.payload;

import cmpe195.group1.minigameplatform.multiplayer.payload.RoomScopedPayload;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class SubmitAnswerPayload extends RoomScopedPayload {
    private String answer;
    private boolean timedOut;
}

