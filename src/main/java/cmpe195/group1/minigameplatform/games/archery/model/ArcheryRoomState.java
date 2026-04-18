package cmpe195.group1.minigameplatform.games.archery.model;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Setter
@Getter
public class ArcheryRoomState {
    private String id;
    private String hostId;
    private int maxPlayers;
    private String state = "waiting";
    private int currentSlot;
    private int currentRound = 1;
    private int arrowsFired;
    private int totalRounds;
    private int arrowsPerRound;
    private double windForce;
    private ArcheryLastShot lastShot;
    private List<ArcheryRoomPlayer> players = new ArrayList<>();
}
