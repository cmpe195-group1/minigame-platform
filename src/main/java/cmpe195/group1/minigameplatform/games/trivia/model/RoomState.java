package cmpe195.group1.minigameplatform.games.trivia.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
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
    private PendingAnswer pendingAnswer;
    private String systemMessage;

    @JsonIgnore
    private long answerSequence;

    @Setter
    @Getter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class RoomParticipant {
        private String playerId;
        private String name;
        private String clientId;
    }

    @Setter
    @Getter
    public static class GameSettings {
        private String category = "";
        private String difficulty = "";
        private String type = "";
        private int questionsPerPlayer = 5;
        private boolean autoContinueAfterReveal;
    }

    @Setter
    @Getter
    public static class PlayerRecord {
        private String id;
        private String name;
        private int score;
        private int answered;

    }

    @Setter
    @Getter
    public static class ActiveQuestion {
        private String category;
        private String difficulty;
        private String type;
        private String prompt;
        private String correctAnswer;
        private List<String> answers = new ArrayList<>();

    }

    @Setter
    @Getter
    public static class RevealState {
        private String selectedAnswer;
        private boolean correct;
        private boolean timedOut;

    }

    @Setter
    @Getter
    public static class BroadcastGameState {
        private String phase;
        private List<PlayerRecord> players = new ArrayList<>();
        private int currentTurn;
        private ActiveQuestion activeQuestion;
        private RevealState revealState;
        private int secondsLeft;
        private GameSettings settings = new GameSettings();
        private String gameError = "";
        private long autoContinueRemainingMs;

    }

    @Setter
    @Getter
    public static class PendingAnswer {
        private long submissionId;
        private String playerId;
        private String answer;
        private boolean timedOut;

    }
}

