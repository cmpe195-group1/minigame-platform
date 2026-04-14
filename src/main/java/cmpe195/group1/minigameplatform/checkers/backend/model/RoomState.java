package cmpe195.group1.minigameplatform.checkers.backend.model;

import java.util.ArrayList;
import java.util.List;

public class RoomState {
    private String roomCode;
    private String hostClientId;
    private int maxPlayers = 2;
    private String transport = "websocket";
    private List<RoomParticipant> participants = new ArrayList<>();
    private String status = "waiting";
    private CheckersGameState gameState;
    private String winner;
    private int moveCount;

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

    public CheckersGameState getGameState() {
        return gameState;
    }

    public void setGameState(CheckersGameState gameState) {
        this.gameState = gameState;
    }

    public String getWinner() {
        return winner;
    }

    public void setWinner(String winner) {
        this.winner = winner;
    }

    public int getMoveCount() {
        return moveCount;
    }

    public void setMoveCount(int moveCount) {
        this.moveCount = moveCount;
    }
}
