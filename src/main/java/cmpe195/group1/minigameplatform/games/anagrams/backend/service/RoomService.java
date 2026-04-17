package cmpe195.group1.minigameplatform.games.anagrams.backend.service;

import cmpe195.group1.minigameplatform.games.anagrams.backend.model.RoomState;
import cmpe195.group1.minigameplatform.games.anagrams.backend.payload.EndTurnPayload;
import cmpe195.group1.minigameplatform.games.anagrams.backend.payload.PublishStatePayload;
import cmpe195.group1.minigameplatform.games.anagrams.backend.payload.SubmitWordPayload;
import cmpe195.group1.minigameplatform.games.anagrams.backend.payload.UpdateSettingsPayload;
import cmpe195.group1.minigameplatform.multiplayer.payload.CreateRoomRequest;
import cmpe195.group1.minigameplatform.multiplayer.payload.JoinRoomRequest;
import cmpe195.group1.minigameplatform.multiplayer.service.RoomActionResult;
import cmpe195.group1.minigameplatform.multiplayer.service.SnapshotRoomService;
import cmpe195.group1.minigameplatform.multiplayer.util.RoomCodeUtils;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service("anagramsRoomService")
public class RoomService implements SnapshotRoomService<RoomState> {

    private static final String HOST_PLAYER_ID = "host-player";
    private static final String ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int MIN_PLAYERS = 2;
    private static final int MAX_PLAYERS = 6;

    private final Random random = new Random();
    private final Map<String, RoomState> rooms = new ConcurrentHashMap<>();

    public RoomState getRoom(String roomCode) {
        if (roomCode == null) {
            return null;
        }
        return rooms.get(RoomCodeUtils.normalize(roomCode));
    }

    @Override
    public RoomState createRoom(String clientId, CreateRoomRequest payload) {
        String code;
        do {
            code = RoomCodeUtils.generate(random, ROOM_CHARS, 6);
        } while (rooms.containsKey(code));

        int maxPlayers = payload != null && payload.getMaxPlayers() != null ? payload.getMaxPlayers() : MAX_PLAYERS;
        maxPlayers = Math.min(Math.max(MIN_PLAYERS, maxPlayers), MAX_PLAYERS);

        String hostName = payload != null ? payload.resolvePlayerName() : null;
        if (hostName == null || hostName.isBlank()) {
            hostName = "Host";
        }

        RoomState room = new RoomState();
        room.setRoomCode(code);
        room.setHostClientId(clientId);
        room.setMaxPlayers(maxPlayers);
        room.setParticipants(new ArrayList<>(List.of(new RoomState.RoomParticipant(HOST_PLAYER_ID, hostName, clientId))));
        room.setStatus("waiting");
        room.setSettings(new RoomState.GameSettings());
        room.setGameState(null);
        room.setPendingAction(null);
        room.setSystemMessage(null);

        rooms.put(code, room);
        return room;
    }

    @Override
    public RoomActionResult<RoomState> joinRoom(String clientId, JoinRoomRequest payload) {
        String code = payload != null && payload.resolveRoomCode() != null
            ? RoomCodeUtils.normalize(payload.resolveRoomCode())
            : "";

        RoomState room = rooms.get(code);
        if (room == null || room.getHostClientId() == null || room.getHostClientId().isBlank()) {
            return RoomActionResult.error("Room not found. Check the code and try again.");
        }

        synchronized (room) {
            if ("playing".equals(room.getStatus())) {
                return RoomActionResult.error("Game already started. Cannot join now.");
            }
            if (room.getParticipants().size() >= room.getMaxPlayers()) {
                return RoomActionResult.error("Room is full.");
            }

            Optional<RoomState.RoomParticipant> already = room.getParticipants().stream()
                .filter(participant -> Objects.equals(participant.getClientId(), clientId))
                .findFirst();
            if (already.isPresent()) {
                return RoomActionResult.ok(room);
            }

            String playerName = payload != null ? payload.getPlayerName() : null;
            if (playerName == null || playerName.isBlank()) {
                playerName = "Guest " + room.getParticipants().size();
            }
            String normalizedPlayerName = playerName.trim().toLowerCase(Locale.ROOT);

            boolean nameTaken = room.getParticipants().stream()
                .anyMatch(participant -> participant.getName() != null
                    && participant.getName().trim().toLowerCase(Locale.ROOT).equals(normalizedPlayerName));
            if (nameTaken) {
                return RoomActionResult.error("Player name already taken in this lobby.");
            }

            room.getParticipants().add(new RoomState.RoomParticipant(
                "guest-player-" + (room.getParticipants().size() + 1),
                playerName.trim(),
                clientId
            ));
            room.setSystemMessage(null);
            return RoomActionResult.ok(room);
        }
    }

    public RoomState updateSettings(String clientId, UpdateSettingsPayload payload) {
        if (payload == null || payload.getSettings() == null) {
            return null;
        }

        RoomState room = getRoom(payload.resolveRoomCode());
        if (room == null) {
            return null;
        }

        synchronized (room) {
            if (!Objects.equals(room.getHostClientId(), clientId)) {
                return null;
            }

            room.setSettings(payload.getSettings());
            room.setSystemMessage(null);
            return room;
        }
    }

    public RoomState publishState(String clientId, PublishStatePayload payload) {
        if (payload == null || payload.getGameState() == null) {
            return null;
        }

        RoomState room = getRoom(payload.resolveRoomCode());
        if (room == null) {
            return null;
        }

        synchronized (room) {
            if (!Objects.equals(room.getHostClientId(), clientId)) {
                return null;
            }

            RoomState.BroadcastGameState gameState = payload.getGameState();
            room.setGameState(gameState);
            if (gameState.getSettings() != null) {
                room.setSettings(gameState.getSettings());
            }
            room.setPendingAction(null);
            room.setSystemMessage(null);
            room.setStatus("playing".equals(gameState.getPhase()) ? "playing" : "waiting");
            return room;
        }
    }

    public RoomState submitWord(String clientId, SubmitWordPayload payload) {
        if (payload == null) {
            return null;
        }

        RoomState room = getRoom(payload.resolveRoomCode());
        if (room == null) {
            return null;
        }

        synchronized (room) {
            if (!"playing".equals(room.getStatus()) || Objects.equals(room.getHostClientId(), clientId)) {
                return null;
            }

            RoomState.RoomParticipant participant = room.getParticipants().stream()
                .filter(current -> Objects.equals(current.getClientId(), clientId))
                .findFirst()
                .orElse(null);
            if (participant == null) {
                return null;
            }

            long submissionId = room.getActionSequence() + 1;
            room.setActionSequence(submissionId);

            RoomState.PendingAction pendingAction = new RoomState.PendingAction();
            pendingAction.setSubmissionId(submissionId);
            pendingAction.setPlayerId(participant.getPlayerId());
            pendingAction.setActionType("submit_word");
            pendingAction.setWord(payload.getWord());
            room.setPendingAction(pendingAction);
            room.setSystemMessage(null);
            return room;
        }
    }

    public RoomState endTurn(String clientId, EndTurnPayload payload) {
        if (payload == null) {
            return null;
        }

        RoomState room = getRoom(payload.resolveRoomCode());
        if (room == null) {
            return null;
        }

        synchronized (room) {
            if (!"playing".equals(room.getStatus()) || Objects.equals(room.getHostClientId(), clientId)) {
                return null;
            }

            RoomState.RoomParticipant participant = room.getParticipants().stream()
                .filter(current -> Objects.equals(current.getClientId(), clientId))
                .findFirst()
                .orElse(null);
            if (participant == null) {
                return null;
            }

            long submissionId = room.getActionSequence() + 1;
            room.setActionSequence(submissionId);

            RoomState.PendingAction pendingAction = new RoomState.PendingAction();
            pendingAction.setSubmissionId(submissionId);
            pendingAction.setPlayerId(participant.getPlayerId());
            pendingAction.setActionType("end_turn");
            pendingAction.setWord(null);
            room.setPendingAction(pendingAction);
            room.setSystemMessage(null);
            return room;
        }
    }

    @Override
    public RoomState disconnect(String clientId, String roomCode) {
        RoomState room = getRoom(roomCode);
        if (room == null) {
            return null;
        }

        synchronized (room) {
            boolean wasHost = Objects.equals(room.getHostClientId(), clientId);
            room.getParticipants().removeIf(participant -> Objects.equals(participant.getClientId(), clientId));
            room.setPendingAction(null);

            if (room.getParticipants().isEmpty()) {
                rooms.remove(room.getRoomCode());
                return null;
            }

            if (wasHost) {
                room.setHostClientId(null);
                room.setStatus("finished");
                room.setGameState(null);
                room.setSystemMessage("The host disconnected, so this room has closed.");
                return room;
            }

            if (room.getParticipants().size() < MIN_PLAYERS) {
                room.setStatus("waiting");
                room.setGameState(null);
                room.setSystemMessage("Not enough players remain to continue this match.");
            }

            return room;
        }
    }

    @Override
    public String roomCodeOf(RoomState room) {
        return room != null ? room.getRoomCode() : null;
    }
}

