package cmpe195.group1.minigameplatform.games.anagrams.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
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
    private GameSettings settings = new GameSettings();
    private BroadcastGameState gameState;
    private PendingAction pendingAction;
    private String systemMessage;

    @JsonIgnore private long actionSequence;

    @Setter
    @Getter
    @AllArgsConstructor
    public static class RoomParticipant {
        private String playerId;
        private String name;
        private String clientId;
    }

    @Setter
    @Getter
    public static class GameSettings {
        private int letterCount = 8;
        private int minimumWordLength = 3;
        private int turnSeconds = 45;
    }

    @Setter
    @Getter
    public static class SubmittedWord {
        private String value;
        private int points;
    }

    @Setter
    @Getter
    public static class PlayerRecord {
        private String id;
        private String name;
        private int score;
        private List<SubmittedWord> words = new ArrayList<>();
        private int attempts;
    }

    @Setter
    @Getter
    public static class BroadcastGameState {
        private String phase;
        private List<PlayerRecord> players = new ArrayList<>();
        private List<String> sharedLetters = new ArrayList<>();
        private int currentTurn;
        private int secondsLeft;
        private GameSettings settings = new GameSettings();
        private String turnMessage = "";
        private String lastSubmissionStatus;
    }

    @Setter
    @Getter
    public static class PendingAction {
        private long submissionId;
        private String playerId;
        private String actionType;
        private String word;
    }
}

