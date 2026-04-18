package cmpe195.group1.minigameplatform.games.uno.backend.model;

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
        private int turnSeconds = 30;
        private int startingHandSize = 7;

        public int getTurnSeconds() {
            return turnSeconds;
        }

        public void setTurnSeconds(int turnSeconds) {
            this.turnSeconds = turnSeconds;
        }

        public int getStartingHandSize() {
            return startingHandSize;
        }

        public void setStartingHandSize(int startingHandSize) {
            this.startingHandSize = startingHandSize;
        }
    }

    public static class UnoCard {
        private String id;
        private String color;
        private String kind;
        private Integer value;

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getColor() {
            return color;
        }

        public void setColor(String color) {
            this.color = color;
        }

        public String getKind() {
            return kind;
        }

        public void setKind(String kind) {
            this.kind = kind;
        }

        public Integer getValue() {
            return value;
        }

        public void setValue(Integer value) {
            this.value = value;
        }
    }

    public static class PlayerState {
        private String id;
        private String name;
        private List<UnoCard> hand = new ArrayList<>();

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

        public List<UnoCard> getHand() {
            return hand;
        }

        public void setHand(List<UnoCard> hand) {
            this.hand = hand;
        }
    }

    public static class PendingTurnState {
        private int currentPlayerIndex;
        private int direction;
        private String activeColor;
        private String message;

        public int getCurrentPlayerIndex() {
            return currentPlayerIndex;
        }

        public void setCurrentPlayerIndex(int currentPlayerIndex) {
            this.currentPlayerIndex = currentPlayerIndex;
        }

        public int getDirection() {
            return direction;
        }

        public void setDirection(int direction) {
            this.direction = direction;
        }

        public String getActiveColor() {
            return activeColor;
        }

        public void setActiveColor(String activeColor) {
            this.activeColor = activeColor;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }
    }

    public static class BroadcastGameState {
        private String phase;
        private List<PlayerState> players = new ArrayList<>();
        private List<UnoCard> drawPile = new ArrayList<>();
        private List<UnoCard> discardPile = new ArrayList<>();
        private int currentPlayerIndex;
        private int direction = 1;
        private String activeColor = "red";
        private int secondsLeft = 30;
        private boolean hasDrawnThisTurn;
        private String drawnCardId;
        private String awaitingEndTurnReason;
        private PendingTurnState pendingTurnState;
        private String turnMessage = "";
        private String winnerId;
        private GameSettings settings = new GameSettings();

        public String getPhase() {
            return phase;
        }

        public void setPhase(String phase) {
            this.phase = phase;
        }

        public List<PlayerState> getPlayers() {
            return players;
        }

        public void setPlayers(List<PlayerState> players) {
            this.players = players;
        }

        public List<UnoCard> getDrawPile() {
            return drawPile;
        }

        public void setDrawPile(List<UnoCard> drawPile) {
            this.drawPile = drawPile;
        }

        public List<UnoCard> getDiscardPile() {
            return discardPile;
        }

        public void setDiscardPile(List<UnoCard> discardPile) {
            this.discardPile = discardPile;
        }

        public int getCurrentPlayerIndex() {
            return currentPlayerIndex;
        }

        public void setCurrentPlayerIndex(int currentPlayerIndex) {
            this.currentPlayerIndex = currentPlayerIndex;
        }

        public int getDirection() {
            return direction;
        }

        public void setDirection(int direction) {
            this.direction = direction;
        }

        public String getActiveColor() {
            return activeColor;
        }

        public void setActiveColor(String activeColor) {
            this.activeColor = activeColor;
        }

        public int getSecondsLeft() {
            return secondsLeft;
        }

        public void setSecondsLeft(int secondsLeft) {
            this.secondsLeft = secondsLeft;
        }

        public boolean isHasDrawnThisTurn() {
            return hasDrawnThisTurn;
        }

        public void setHasDrawnThisTurn(boolean hasDrawnThisTurn) {
            this.hasDrawnThisTurn = hasDrawnThisTurn;
        }

        public String getDrawnCardId() {
            return drawnCardId;
        }

        public void setDrawnCardId(String drawnCardId) {
            this.drawnCardId = drawnCardId;
        }

        public String getAwaitingEndTurnReason() {
            return awaitingEndTurnReason;
        }

        public void setAwaitingEndTurnReason(String awaitingEndTurnReason) {
            this.awaitingEndTurnReason = awaitingEndTurnReason;
        }

        public PendingTurnState getPendingTurnState() {
            return pendingTurnState;
        }

        public void setPendingTurnState(PendingTurnState pendingTurnState) {
            this.pendingTurnState = pendingTurnState;
        }

        public String getTurnMessage() {
            return turnMessage;
        }

        public void setTurnMessage(String turnMessage) {
            this.turnMessage = turnMessage;
        }

        public String getWinnerId() {
            return winnerId;
        }

        public void setWinnerId(String winnerId) {
            this.winnerId = winnerId;
        }

        public GameSettings getSettings() {
            return settings;
        }

        public void setSettings(GameSettings settings) {
            this.settings = settings;
        }
    }

    public static class PendingAction {
        private long actionId;
        private String playerId;
        private String kind;
        private String cardId;
        private String chosenColor;

        public long getActionId() {
            return actionId;
        }

        public void setActionId(long actionId) {
            this.actionId = actionId;
        }

        public String getPlayerId() {
            return playerId;
        }

        public void setPlayerId(String playerId) {
            this.playerId = playerId;
        }

        public String getKind() {
            return kind;
        }

        public void setKind(String kind) {
            this.kind = kind;
        }

        public String getCardId() {
            return cardId;
        }

        public void setCardId(String cardId) {
            this.cardId = cardId;
        }

        public String getChosenColor() {
            return chosenColor;
        }

        public void setChosenColor(String chosenColor) {
            this.chosenColor = chosenColor;
        }
    }
}

