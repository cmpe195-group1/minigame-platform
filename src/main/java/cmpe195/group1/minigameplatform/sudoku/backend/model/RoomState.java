package cmpe195.group1.minigameplatform.sudoku.backend.model;

import java.util.ArrayList;
import java.util.List;

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

    public List<List<SudokuCell>> getBoard() {
        return board;
    }

    public void setBoard(List<List<SudokuCell>> board) {
        this.board = board;
    }

    public List<PlayerScore> getPlayers() {
        return players;
    }

    public void setPlayers(List<PlayerScore> players) {
        this.players = players;
    }

    public int getCurrentPlayerIndex() {
        return currentPlayerIndex;
    }

    public void setCurrentPlayerIndex(int currentPlayerIndex) {
        this.currentPlayerIndex = currentPlayerIndex;
    }

    public String getPhase() {
        return phase;
    }

    public void setPhase(String phase) {
        this.phase = phase;
    }

    public PlayerScore getWinner() {
        return winner;
    }

    public void setWinner(PlayerScore winner) {
        this.winner = winner;
    }

    public Boolean getLastMoveCorrect() {
        return lastMoveCorrect;
    }

    public void setLastMoveCorrect(Boolean lastMoveCorrect) {
        this.lastMoveCorrect = lastMoveCorrect;
    }

    public int getMoveCount() {
        return moveCount;
    }

    public void setMoveCount(int moveCount) {
        this.moveCount = moveCount;
    }
}
