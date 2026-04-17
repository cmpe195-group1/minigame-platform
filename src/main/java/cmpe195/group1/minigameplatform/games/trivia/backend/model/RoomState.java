package cmpe195.group1.minigameplatform.games.trivia.backend.model;

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
    private PendingAnswer pendingAnswer;
    private String systemMessage;

    @JsonIgnore
    private long answerSequence;

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

    public PendingAnswer getPendingAnswer() {
        return pendingAnswer;
    }

    public void setPendingAnswer(PendingAnswer pendingAnswer) {
        this.pendingAnswer = pendingAnswer;
    }

    public String getSystemMessage() {
        return systemMessage;
    }

    public void setSystemMessage(String systemMessage) {
        this.systemMessage = systemMessage;
    }

    public long getAnswerSequence() {
        return answerSequence;
    }

    public void setAnswerSequence(long answerSequence) {
        this.answerSequence = answerSequence;
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
        private String category = "";
        private String difficulty = "";
        private String type = "";
        private int questionsPerPlayer = 5;
        private boolean autoContinueAfterReveal;

        public String getCategory() {
            return category;
        }

        public void setCategory(String category) {
            this.category = category;
        }

        public String getDifficulty() {
            return difficulty;
        }

        public void setDifficulty(String difficulty) {
            this.difficulty = difficulty;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public int getQuestionsPerPlayer() {
            return questionsPerPlayer;
        }

        public void setQuestionsPerPlayer(int questionsPerPlayer) {
            this.questionsPerPlayer = questionsPerPlayer;
        }

        public boolean isAutoContinueAfterReveal() {
            return autoContinueAfterReveal;
        }

        public void setAutoContinueAfterReveal(boolean autoContinueAfterReveal) {
            this.autoContinueAfterReveal = autoContinueAfterReveal;
        }
    }

    public static class PlayerRecord {
        private String id;
        private String name;
        private int score;
        private int answered;

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

        public int getAnswered() {
            return answered;
        }

        public void setAnswered(int answered) {
            this.answered = answered;
        }
    }

    public static class ActiveQuestion {
        private String category;
        private String difficulty;
        private String type;
        private String prompt;
        private String correctAnswer;
        private List<String> answers = new ArrayList<>();

        public String getCategory() {
            return category;
        }

        public void setCategory(String category) {
            this.category = category;
        }

        public String getDifficulty() {
            return difficulty;
        }

        public void setDifficulty(String difficulty) {
            this.difficulty = difficulty;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public String getPrompt() {
            return prompt;
        }

        public void setPrompt(String prompt) {
            this.prompt = prompt;
        }

        public String getCorrectAnswer() {
            return correctAnswer;
        }

        public void setCorrectAnswer(String correctAnswer) {
            this.correctAnswer = correctAnswer;
        }

        public List<String> getAnswers() {
            return answers;
        }

        public void setAnswers(List<String> answers) {
            this.answers = answers;
        }
    }

    public static class RevealState {
        private String selectedAnswer;
        private boolean correct;
        private boolean timedOut;

        public String getSelectedAnswer() {
            return selectedAnswer;
        }

        public void setSelectedAnswer(String selectedAnswer) {
            this.selectedAnswer = selectedAnswer;
        }

        public boolean isCorrect() {
            return correct;
        }

        public void setCorrect(boolean correct) {
            this.correct = correct;
        }

        public boolean isTimedOut() {
            return timedOut;
        }

        public void setTimedOut(boolean timedOut) {
            this.timedOut = timedOut;
        }
    }

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

        public int getCurrentTurn() {
            return currentTurn;
        }

        public void setCurrentTurn(int currentTurn) {
            this.currentTurn = currentTurn;
        }

        public ActiveQuestion getActiveQuestion() {
            return activeQuestion;
        }

        public void setActiveQuestion(ActiveQuestion activeQuestion) {
            this.activeQuestion = activeQuestion;
        }

        public RevealState getRevealState() {
            return revealState;
        }

        public void setRevealState(RevealState revealState) {
            this.revealState = revealState;
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

        public String getGameError() {
            return gameError;
        }

        public void setGameError(String gameError) {
            this.gameError = gameError;
        }

        public long getAutoContinueRemainingMs() {
            return autoContinueRemainingMs;
        }

        public void setAutoContinueRemainingMs(long autoContinueRemainingMs) {
            this.autoContinueRemainingMs = autoContinueRemainingMs;
        }
    }

    public static class PendingAnswer {
        private long submissionId;
        private String playerId;
        private String answer;
        private boolean timedOut;

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

        public String getAnswer() {
            return answer;
        }

        public void setAnswer(String answer) {
            this.answer = answer;
        }

        public boolean isTimedOut() {
            return timedOut;
        }

        public void setTimedOut(boolean timedOut) {
            this.timedOut = timedOut;
        }
    }
}

