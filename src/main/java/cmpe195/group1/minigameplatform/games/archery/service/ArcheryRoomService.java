package cmpe195.group1.minigameplatform.games.archery.service;

import cmpe195.group1.minigameplatform.games.archery.model.ArcheryArrowScore;
import cmpe195.group1.minigameplatform.games.archery.model.ArcheryLastShot;
import cmpe195.group1.minigameplatform.games.archery.model.ArcheryRoomPlayer;
import cmpe195.group1.minigameplatform.games.archery.model.ArcheryRoomState;
import cmpe195.group1.minigameplatform.games.archery.payload.ArcheryArrowShotPayload;
import cmpe195.group1.minigameplatform.multiplayer.payload.CreateRoomRequest;
import cmpe195.group1.minigameplatform.multiplayer.payload.JoinRoomRequest;
import cmpe195.group1.minigameplatform.multiplayer.service.RoomActionResult;
import cmpe195.group1.minigameplatform.multiplayer.service.SnapshotRoomService;
import cmpe195.group1.minigameplatform.multiplayer.util.RoomCodeUtils;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ArcheryRoomService implements SnapshotRoomService<ArcheryRoomState> {

    private static final List<String> PLAYER_COLORS = List.of(
        "#e74c3c",
        "#3498db",
        "#2ecc71",
        "#f39c12"
    );

    private static final String ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int TOTAL_ROUNDS = 3;
    private static final int ARROWS_PER_ROUND = 3;

    private final Map<String, ArcheryRoomState> rooms = new ConcurrentHashMap<>();
    private final Random random = new Random();

    public ArcheryRoomState getRoom(String roomId) {
        if (roomId == null) {
            return null;
        }
        return rooms.get(normalizeRoomId(roomId));
    }

    @Override
    public ArcheryRoomState createRoom(String clientId, CreateRoomRequest payload) {
        String roomId;
        do {
            roomId = RoomCodeUtils.generate(random, ROOM_CHARS, 5);
        } while (rooms.containsKey(roomId));

        int maxPlayers = payload != null && payload.getMaxPlayers() != null ? payload.getMaxPlayers() : 2;
        maxPlayers = Math.min(Math.max(maxPlayers, 2), 4);

        ArcheryRoomState room = new ArcheryRoomState();
        room.setId(roomId);
        room.setHostId(clientId);
        room.setMaxPlayers(maxPlayers);
        room.setState("waiting");
        room.setCurrentSlot(0);
        room.setCurrentRound(1);
        room.setArrowsFired(0);
        room.setTotalRounds(TOTAL_ROUNDS);
        room.setArrowsPerRound(ARROWS_PER_ROUND);
        room.setWindForce(freshWind());
        room.setLastShot(null);
        room.setPlayers(new ArrayList<>(List.of(createPlayer(
            clientId,
            resolvePlayerName(payload != null ? payload.resolvePlayerName() : null, 1),
            0
        ))));

        rooms.put(roomId, room);
        return room;
    }

    @Override
    public RoomActionResult<ArcheryRoomState> joinRoom(String clientId, JoinRoomRequest payload) {
        String roomId = payload != null ? RoomCodeUtils.normalize(payload.resolveRoomCode()) : "";
        ArcheryRoomState room = rooms.get(roomId);
        if (room == null) {
            return RoomActionResult.error("Room not found. Check the code and try again.");
        }

        synchronized (room) {
            Optional<ArcheryRoomPlayer> existingPlayer = findPlayer(room, clientId);
            if (existingPlayer.isPresent()) {
                return RoomActionResult.ok(room);
            }

            if (!"waiting".equals(room.getState())) {
                return RoomActionResult.error("This game has already started.");
            }
            if (room.getPlayers().size() >= room.getMaxPlayers()) {
                return RoomActionResult.error("Room is full.");
            }

            int slotIdx = room.getPlayers().size();
            room.getPlayers().add(createPlayer(
                clientId,
                resolvePlayerName(payload != null ? payload.getPlayerName() : null, slotIdx + 1),
                slotIdx
            ));

            return RoomActionResult.ok(room);
        }
    }

    public RoomActionResult<ArcheryRoomState> setReady(String clientId, String roomId) {
        ArcheryRoomState room = getRoom(roomId);
        if (room == null) {
            return RoomActionResult.error("Room not found.");
        }

        synchronized (room) {
            if (!"waiting".equals(room.getState())) {
                return RoomActionResult.error("Game already started.");
            }

            ArcheryRoomPlayer player = findPlayer(room, clientId).orElse(null);
            if (player == null) {
                return RoomActionResult.error("You are not in this room.");
            }

            player.setReady(true);
            if (room.getPlayers().size() >= 2 && room.getPlayers().stream().allMatch(ArcheryRoomPlayer::isReady)) {
                startRoom(room);
            }

            return RoomActionResult.ok(room);
        }
    }

    public RoomActionResult<ArcheryRoomState> startGame(String clientId, String roomId) {
        ArcheryRoomState room = getRoom(roomId);
        if (room == null) {
            return RoomActionResult.error("Room not found.");
        }

        synchronized (room) {
            if (!Objects.equals(room.getHostId(), clientId)) {
                return RoomActionResult.error("Only the host can start the game.");
            }
            if (!"waiting".equals(room.getState())) {
                return RoomActionResult.error("Game already started.");
            }
            if (room.getPlayers().size() < 2) {
                return RoomActionResult.error("Need at least 2 players to start.");
            }

            startRoom(room);
            return RoomActionResult.ok(room);
        }
    }

    public RoomActionResult<ArcheryRoomState> recordArrowShot(String clientId, ArcheryArrowShotPayload payload) {
        if (payload == null) {
            return RoomActionResult.error("Missing shot payload.");
        }

        ArcheryRoomState room = getRoom(payload.getRoomId());
        if (room == null) {
            return RoomActionResult.error("Room not found.");
        }

        synchronized (room) {
            if (!"playing".equals(room.getState())) {
                return RoomActionResult.error("Game is not active.");
            }
            if (room.getPlayers().isEmpty()) {
                return RoomActionResult.error("No active players in the room.");
            }
            if (room.getCurrentSlot() < 0 || room.getCurrentSlot() >= room.getPlayers().size()) {
                return RoomActionResult.error("Turn order is out of sync.");
            }

            ArcheryRoomPlayer player = findPlayer(room, clientId).orElse(null);
            if (player == null) {
                return RoomActionResult.error("You are not in this room.");
            }

            ArcheryRoomPlayer activePlayer = room.getPlayers().get(room.getCurrentSlot());
            if (!Objects.equals(activePlayer.getId(), player.getId())) {
                return RoomActionResult.error("It is not your turn yet.");
            }

            int score = Math.max(0, Math.min(10, payload.getScore() != null ? payload.getScore() : 0));
            double dist = Math.max(0, payload.getDist() != null ? payload.getDist() : 0.0);
            double impactX = payload.getImpactX() != null ? payload.getImpactX() : 0.0;
            double impactY = payload.getImpactY() != null ? payload.getImpactY() : 0.0;

            player.getScores().add(new ArcheryArrowScore(room.getCurrentRound(), score, dist));
            player.setTotal(player.getTotal() + score);
            int nextShotSequence = room.getLastShot() != null ? room.getLastShot().getSequence() + 1 : 1;
            room.setLastShot(new ArcheryLastShot(
                nextShotSequence,
                player.getSlotIdx(),
                score,
                dist,
                impactX,
                impactY
            ));
            room.setArrowsFired(room.getArrowsFired() + 1);

            if (room.getArrowsFired() < room.getArrowsPerRound()) {
                return RoomActionResult.ok(room);
            }

            room.setArrowsFired(0);
            int nextSlot = room.getCurrentSlot() + 1;
            if (nextSlot >= room.getPlayers().size()) {
                nextSlot = 0;
                if (room.getCurrentRound() >= room.getTotalRounds()) {
                    room.setState("finished");
                    room.setCurrentSlot(0);
                    return RoomActionResult.ok(room);
                }
                room.setCurrentRound(room.getCurrentRound() + 1);
            }

            room.setCurrentSlot(nextSlot);
            room.setWindForce(freshWind());
            return RoomActionResult.ok(room);
        }
    }

    @Override
    public ArcheryRoomState disconnect(String clientId, String roomId) {
        ArcheryRoomState room = getRoom(roomId);
        if (room == null) {
            return null;
        }

        synchronized (room) {
            ArcheryRoomPlayer leavingPlayer = findPlayer(room, clientId).orElse(null);
            if (leavingPlayer == null) {
                return room;
            }

            int removedSlot = leavingPlayer.getSlotIdx();
            room.getPlayers().removeIf(player -> Objects.equals(player.getId(), clientId));

            if (room.getPlayers().isEmpty()) {
                rooms.remove(room.getId());
                return null;
            }

            reindexPlayers(room);

            if (Objects.equals(room.getHostId(), clientId)) {
                room.setHostId(room.getPlayers().get(0).getId());
            }

            if (room.getCurrentSlot() > removedSlot) {
                room.setCurrentSlot(room.getCurrentSlot() - 1);
            }
            if (room.getCurrentSlot() >= room.getPlayers().size()) {
                room.setCurrentSlot(0);
            }

            if ("playing".equals(room.getState()) && room.getPlayers().size() < 2) {
                room.setState("finished");
                room.setCurrentSlot(0);
            }

            return room;
        }
    }

    private void startRoom(ArcheryRoomState room) {
        room.setState("playing");
        room.setCurrentSlot(0);
        room.setCurrentRound(1);
        room.setArrowsFired(0);
        room.setWindForce(freshWind());
        room.setLastShot(null);

        for (ArcheryRoomPlayer player : room.getPlayers()) {
            player.setScores(new ArrayList<>());
            player.setTotal(0);
        }
    }

    private ArcheryRoomPlayer createPlayer(String clientId, String playerName, int slotIdx) {
        return new ArcheryRoomPlayer(
            clientId,
            playerName,
            PLAYER_COLORS.get(Math.min(slotIdx, PLAYER_COLORS.size() - 1)),
            new ArrayList<>(),
            0,
            false,
            slotIdx
        );
    }

    private Optional<ArcheryRoomPlayer> findPlayer(ArcheryRoomState room, String clientId) {
        return room.getPlayers().stream()
            .filter(player -> Objects.equals(player.getId(), clientId))
            .findFirst();
    }

    private void reindexPlayers(ArcheryRoomState room) {
        for (int i = 0; i < room.getPlayers().size(); i++) {
            ArcheryRoomPlayer player = room.getPlayers().get(i);
            player.setSlotIdx(i);
            player.setColor(PLAYER_COLORS.get(Math.min(i, PLAYER_COLORS.size() - 1)));
        }
    }

    private String resolvePlayerName(String requestedName, int playerNumber) {
        if (requestedName == null || requestedName.isBlank()) {
            return "Player " + playerNumber;
        }
        String trimmed = requestedName.trim();
        return trimmed.length() > 20 ? trimmed.substring(0, 20) : trimmed;
    }

    private String normalizeRoomId(String roomId) {
        return RoomCodeUtils.normalize(roomId);
    }

    @Override
    public String roomCodeOf(ArcheryRoomState room) {
        return room != null ? room.getId() : null;
    }

    private double freshWind() {
        double value = (random.nextDouble() * 160.0) - 80.0;
        return Math.round(value * 10.0) / 10.0;
    }
}
