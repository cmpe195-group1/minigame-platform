package cmpe195.group1.minigameplatform.games.battleship.model;

import lombok.Getter;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Getter
public class BattleshipRoom {
    private final String roomId;
    private final int maxPlayers;
    private final List<String> playerTokens;

    public BattleshipRoom(String roomId, int maxPlayers) {
        this.roomId = roomId;
        this.maxPlayers = maxPlayers;
        this.playerTokens = new ArrayList<>(Collections.nCopies(maxPlayers, null));
    }

}
