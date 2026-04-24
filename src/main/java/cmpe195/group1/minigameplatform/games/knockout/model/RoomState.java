package cmpe195.group1.minigameplatform.games.knockout.model;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class RoomState {
    private String roomCode;
    private String hostClientId;
    private int maxPlayers = 2;
    private List<RoomParticipant> participants = new ArrayList<>();
    private String status;
    private KnockoutGameState gameState;
    private LastShot lastShot;
}