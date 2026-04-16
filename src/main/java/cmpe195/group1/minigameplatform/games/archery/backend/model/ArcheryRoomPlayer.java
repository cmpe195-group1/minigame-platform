package cmpe195.group1.minigameplatform.games.archery.backend.model;

import java.util.ArrayList;
import java.util.List;

public class ArcheryRoomPlayer {
    private String id;
    private String name;
    private String color;
    private List<ArcheryArrowScore> scores = new ArrayList<>();
    private int total;
    private boolean ready;
    private int slotIdx;

    public ArcheryRoomPlayer() {
    }

    public ArcheryRoomPlayer(
        String id,
        String name,
        String color,
        List<ArcheryArrowScore> scores,
        int total,
        boolean ready,
        int slotIdx
    ) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.scores = scores;
        this.total = total;
        this.ready = ready;
        this.slotIdx = slotIdx;
    }

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

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public List<ArcheryArrowScore> getScores() {
        return scores;
    }

    public void setScores(List<ArcheryArrowScore> scores) {
        this.scores = scores;
    }

    public int getTotal() {
        return total;
    }

    public void setTotal(int total) {
        this.total = total;
    }

    public boolean isReady() {
        return ready;
    }

    public void setReady(boolean ready) {
        this.ready = ready;
    }

    public int getSlotIdx() {
        return slotIdx;
    }

    public void setSlotIdx(int slotIdx) {
        this.slotIdx = slotIdx;
    }
}
