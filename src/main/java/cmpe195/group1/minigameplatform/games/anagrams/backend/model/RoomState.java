package cmpe195.group1.minigameplatform.games.anagrams.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.ArrayList;
import java.util.List;

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

    @JsonIgnore
    private long actionSequence;

    public String getRoomCode() {
        return roomCode;
    }

    public void setRoomCode(String roomCode) {
        this.roomCode = roomCode;
    }

    public String getHostClientId() {
        return hostClientId;
    }

    public void setHostClientId(String hostClientId) {
        this.hostClientId = hostClientId;
    }

    public int getMaxPlayers() {
        return maxPlayers;
    }

    public void setMaxPlayers(int maxPlayers) {
        this.maxPlayers = maxPlayers;
    }

    public String getTransport() {
        return transport;
    }

    public void setTransport(String transport) {
        this.transport = transport;
    }

    public List<RoomParticipant> getParticipants() {
        return participants;
    }

    public void setParticipants(List<RoomParticipant> participants) {
        this.participants = participants;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public GameSettings getSettings() {
        return settings;
    }

    public void setSettings(GameSettings settings) {
        this.settings = settings;
    }

    public BroadcastGameState getGameState() {
        return gameState;
    }

    public void setGameState(BroadcastGameState gameState) {
        this.gameState = gameState;
    }

    public PendingAction getPendingAction() {
        return pendingAction;
    }

    public void setPendingAction(PendingAction pendingAction) {
        this.pendingAction = pendingAction;
    }

    public String getSystemMessage() {
        return systemMessage;
    }

    public void setSystemMessage(String systemMessage) {
        this.systemMessage = systemMessage;
    }

    public long getActionSequence() {
        return actionSequence;
    }

    public void setActionSequence(long actionSequence) {
        this.actionSequence = actionSequence;
    }

    public static class RoomParticipant {
        private String playerId;
        private String name;
        private String clientId;

        public RoomParticipant() {
        }

        public RoomParticipant(String playerId, String name, String clientId) {
            this.playerId = playerId;
            this.name = name;
            this.clientId = clientId;
        }

        public String getPlayerId() {
            return playerId;
        }

        public void setPlayerId(String playerId) {
            this.playerId = playerId;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getClientId() {
            return clientId;
        }

        public void setClientId(String clientId) {
            this.clientId = clientId;
        }
    }

    public static class GameSettings {
        private int letterCount = 8;
        private int minimumWordLength = 3;
        private int turnSeconds = 45;

        public int getLetterCount() {
            return letterCount;
        }

        public void setLetterCount(int letterCount) {
            this.letterCount = letterCount;
        }

        public int getMinimumWordLength() {
            return minimumWordLength;
        }

        public void setMinimumWordLength(int minimumWordLength) {
            this.minimumWordLength = minimumWordLength;
        }

        public int getTurnSeconds() {
            return turnSeconds;
        }

        public void setTurnSeconds(int turnSeconds) {
            this.turnSeconds = turnSeconds;
        }
    }

    public static class SubmittedWord {
        private String value;
        private int points;

        public String getValue() {
            return value;
        }

        public void setValue(String value) {
            this.value = value;
        }

        public int getPoints() {
            return points;
        }

        public void setPoints(int points) {
            this.points = points;
        }
    }

    public static class PlayerRecord {
        private String id;
        private String name;
        private int score;
        private List<SubmittedWord> words = new ArrayList<>();
        private int attempts;

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public int getScore() {
            return score;
        }

        public void setScore(int score) {
            this.score = score;
        }

        public List<SubmittedWord> getWords() {
            return words;
        }

        public void setWords(List<SubmittedWord> words) {
            this.words = words;
        }

        public int getAttempts() {
            return attempts;
        }

        public void setAttempts(int attempts) {
            this.attempts = attempts;
        }
    }

    public static class BroadcastGameState {
        private String phase;
        private List<PlayerRecord> players = new ArrayList<>();
        private List<String> sharedLetters = new ArrayList<>();
        private int currentTurn;
        private int secondsLeft;
        private GameSettings settings = new GameSettings();
        private String turnMessage = "";
        private String lastSubmissionStatus;

        public String getPhase() {
            return phase;
        }

        public void setPhase(String phase) {
            this.phase = phase;
        }

        public List<PlayerRecord> getPlayers() {
            return players;
        }

        public void setPlayers(List<PlayerRecord> players) {
            this.players = players;
        }

        public List<String> getSharedLetters() {
            return sharedLetters;
        }

        public void setSharedLetters(List<String> sharedLetters) {
            this.sharedLetters = sharedLetters;
        }

        public int getCurrentTurn() {
            return currentTurn;
        }

        public void setCurrentTurn(int currentTurn) {
            this.currentTurn = currentTurn;
        }

        public int getSecondsLeft() {
            return secondsLeft;
        }

        public void setSecondsLeft(int secondsLeft) {
            this.secondsLeft = secondsLeft;
        }

        public GameSettings getSettings() {
            return settings;
        }

        public void setSettings(GameSettings settings) {
            this.settings = settings;
        }

        public String getTurnMessage() {
            return turnMessage;
        }

        public void setTurnMessage(String turnMessage) {
            this.turnMessage = turnMessage;
        }

        public String getLastSubmissionStatus() {
            return lastSubmissionStatus;
        }

        public void setLastSubmissionStatus(String lastSubmissionStatus) {
            this.lastSubmissionStatus = lastSubmissionStatus;
        }
    }

    public static class PendingAction {
        private long submissionId;
        private String playerId;
        private String actionType;
        private String word;

        public long getSubmissionId() {
            return submissionId;
        }

        public void setSubmissionId(long submissionId) {
            this.submissionId = submissionId;
        }

        public String getPlayerId() {
            return playerId;
        }

        public void setPlayerId(String playerId) {
            this.playerId = playerId;
        }

        public String getActionType() {
            return actionType;
        }

        public void setActionType(String actionType) {
            this.actionType = actionType;
        }

        public String getWord() {
            return word;
        }

        public void setWord(String word) {
            this.word = word;
        }
    }
}

