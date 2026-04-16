package cmpe195.group1.minigameplatform.games.archery.backend.model;

import java.util.ArrayList;
import java.util.List;

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
    private List<ArcheryRoomPlayer> players = new ArrayList<>();

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getHostId() {
        return hostId;
    }

    public void setHostId(String hostId) {
        this.hostId = hostId;
    }

    public int getMaxPlayers() {
        return maxPlayers;
    }

    public void setMaxPlayers(int maxPlayers) {
        this.maxPlayers = maxPlayers;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public int getCurrentSlot() {
        return currentSlot;
    }

    public void setCurrentSlot(int currentSlot) {
        this.currentSlot = currentSlot;
    }

    public int getCurrentRound() {
        return currentRound;
    }

    public void setCurrentRound(int currentRound) {
        this.currentRound = currentRound;
    }

    public int getArrowsFired() {
        return arrowsFired;
    }

    public void setArrowsFired(int arrowsFired) {
        this.arrowsFired = arrowsFired;
    }

    public int getTotalRounds() {
        return totalRounds;
    }

    public void setTotalRounds(int totalRounds) {
        this.totalRounds = totalRounds;
    }

    public int getArrowsPerRound() {
        return arrowsPerRound;
    }

    public void setArrowsPerRound(int arrowsPerRound) {
        this.arrowsPerRound = arrowsPerRound;
    }

    public double getWindForce() {
        return windForce;
    }

    public void setWindForce(double windForce) {
        this.windForce = windForce;
    }

    public List<ArcheryRoomPlayer> getPlayers() {
        return players;
    }

    public void setPlayers(List<ArcheryRoomPlayer> players) {
        this.players = players;
    }
}
