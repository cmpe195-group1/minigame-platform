package cmpe195.group1.minigameplatform.games.sudoku.model;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Setter
@Getter
public class RoomState {
    private String roomCode;
    private String hostClientId;
    private int maxPlayers;
    private String transport = "websocket";
    private List<RoomParticipant> participants = new ArrayList<>();
    private String status = "waiting";

    private List<List<SudokuCell>> board;
    private List<PlayerScore> players = new ArrayList<>();
    private int currentPlayerIndex;
    private String phase = "setup";
    private PlayerScore winner;
    private Boolean lastMoveCorrect;
    private int moveCount;

}
