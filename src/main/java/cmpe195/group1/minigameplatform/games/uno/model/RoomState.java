package cmpe195.group1.minigameplatform.games.uno.model;

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

    @JsonIgnore
    private long actionSequence;

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
        private int turnSeconds = 30;
        private int startingHandSize = 7;
    }

    @Setter
    @Getter
    public static class UnoCard {
        private String id;
        private String color;
        private String kind;
        private Integer value;
    }

    @Setter
    @Getter
    public static class PlayerState {
        private String id;
        private String name;
        private List<UnoCard> hand = new ArrayList<>();
    }

    @Setter
    @Getter
    public static class PendingTurnState {
        private int currentPlayerIndex;
        private int direction;
        private String activeColor;
        private String message;
    }

    @Setter
    @Getter
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
    }

    @Setter
    @Getter
    public static class PendingAction {
        private long actionId;
        private String playerId;
        private String kind;
        private String cardId;
        private String chosenColor;
    }
}

