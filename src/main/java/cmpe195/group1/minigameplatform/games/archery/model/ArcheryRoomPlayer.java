package cmpe195.group1.minigameplatform.games.archery.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@AllArgsConstructor
@Setter
@Getter
public class ArcheryRoomPlayer {
    private String id;
    private String name;
    private String color;
    private List<ArcheryArrowScore> scores = new ArrayList<>();
    private int total;
    private boolean ready;
    private int slotIdx;
}
