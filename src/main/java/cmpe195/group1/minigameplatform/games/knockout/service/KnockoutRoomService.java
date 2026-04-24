package cmpe195.group1.minigameplatform.games.knockout.service;

import cmpe195.group1.minigameplatform.games.knockout.model.KnockoutGameState;
import cmpe195.group1.minigameplatform.games.knockout.model.LastShot;
import cmpe195.group1.minigameplatform.games.knockout.model.PuckState;
import cmpe195.group1.minigameplatform.games.knockout.model.RoomParticipant;
import cmpe195.group1.minigameplatform.games.knockout.model.RoomState;
import cmpe195.group1.minigameplatform.games.knockout.payload.ResolveTurnPayload;
import cmpe195.group1.minigameplatform.games.knockout.payload.ShotPayload;
import cmpe195.group1.minigameplatform.multiplayer.payload.CreateRoomRequest;
import cmpe195.group1.minigameplatform.multiplayer.payload.RoomScopedPayload;
import cmpe195.group1.minigameplatform.multiplayer.service.RoomActionResult;
import cmpe195.group1.minigameplatform.multiplayer.service.SnapshotRoomService;
import cmpe195.group1.minigameplatform.multiplayer.util.RoomCodeUtils;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class KnockoutRoomService implements SnapshotRoomService<RoomState> {

    private static final String ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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

        String hostName = payload != null ? payload.resolvePlayerName() : null;
        if (hostName == null || hostName.isBlank()) {
            hostName = "Player 1";
        }

        RoomState room = new RoomState();
        room.setRoomCode(code);
        room.setHostClientId(clientId);
        room.setParticipants(new ArrayList<>(List.of(
            new RoomParticipant(1, hostName, clientId, "A")
        )));
        room.setStatus("waiting");
        room.setGameState(null);
        room.setLastShot(null);
        room.setMaxPlayers(2);

        rooms.put(code, room);
        return room;
    }

    @Override
    public RoomActionResult<RoomState> joinRoom(String clientId, RoomScopedPayload.JoinRoomRequest payload) {
        String code = payload != null && payload.resolveRoomCode() != null
            ? RoomCodeUtils.normalize(payload.resolveRoomCode())
            : "";

        RoomState room = rooms.get(code);
        if (room == null) {
            return RoomActionResult.error("Room not found. Check the code and try again.");
        }

        synchronized (room) {
            if (!"waiting".equals(room.getStatus())) {
                return RoomActionResult.error("Game already started. Cannot join now.");
            }
            if (room.getParticipants().size() >= room.getMaxPlayers()) {
                return RoomActionResult.error("Room is full.");
            }

            for (RoomParticipant participant : room.getParticipants()) {
                if (Objects.equals(participant.getClientId(), clientId)) {
                    return RoomActionResult.ok(room);
                }
            }

            String playerName = payload != null ? payload.getPlayerName() : null;
            if (playerName == null || playerName.isBlank()) {
                playerName = "Player 2";
            }

            room.getParticipants().add(new RoomParticipant(2, playerName, clientId, "B"));
            return RoomActionResult.ok(room);
        }
    }

    public RoomState startGame(String clientId, String roomCode) {
        RoomState room = getRoom(roomCode);
        if (room == null) {
            return null;
        }

        synchronized (room) {
            if (!Objects.equals(room.getHostClientId(), clientId) || room.getParticipants().size() < 2) {
                return null;
            }

            room.setGameState(createInitialState());
            room.setStatus("playing");
            room.setLastShot(null);
            return room;
        }
    }

    public RoomState recordShot(String clientId, ShotPayload payload) {
        if (payload == null) {
            return null;
        }

        RoomState room = getRoom(payload.getRoomCode());
        if (room == null) {
            return null;
        }

        synchronized (room) {
            if (!"playing".equals(room.getStatus()) || room.getGameState() == null) {
                return null;
            }

            RoomParticipant participant = room.getParticipants().stream()
                .filter(p -> Objects.equals(p.getClientId(), clientId))
                .findFirst()
                .orElse(null);
            if (participant == null) {
                return null;
            }

            if (!Objects.equals(room.getGameState().getCurrentPlayer(), participant.getSide())) {
                return null;
            }

            if (payload.getTurnNumber() != room.getGameState().getTurnNumber()) {
                return null;
            }

            room.setLastShot(new LastShot(
                payload.getPuckId(),
                payload.getTurnNumber(),
                payload.getImpulseX(),
                payload.getImpulseY(),
                clientId
            ));

            room.getGameState().setPhase("waiting");

            return room;
        }
    }

    public RoomState resolveTurn(String clientId, ResolveTurnPayload payload) {
        if (payload == null || payload.getResultingState() == null) {
            return null;
        }

        RoomState room = getRoom(payload.getRoomCode());
        if (room == null) {
            return null;
        }

        synchronized (room) {
            if (!"playing".equals(room.getStatus()) || room.getGameState() == null) {
                return null;
            }

            RoomParticipant participant = room.getParticipants().stream()
                .filter(p -> Objects.equals(p.getClientId(), clientId))
                .findFirst()
                .orElse(null);
            if (participant == null) {
                return null;
            }

            if (!Objects.equals(room.getGameState().getCurrentPlayer(), participant.getSide())) {
                return null;
            }

            KnockoutGameState nextState = copyState(payload.getResultingState());
            if (nextState == null) {
                return null;
            }

            room.setGameState(nextState);
            room.setLastShot(null);

            if ("finished".equals(nextState.getPhase()) || nextState.getWinner() != null) {
                room.setStatus("finished");
            }

            return room;
        }
    }

    public RoomState reset(String clientId, String roomCode) {
        RoomState room = getRoom(roomCode);
        if (room == null) {
            return null;
        }

        synchronized (room) {
            if (!Objects.equals(room.getHostClientId(), clientId)) {
                return null;
            }

            room.setStatus("waiting");
            room.setGameState(null);
            room.setLastShot(null);
            return room;
        }
    }

    public RoomState disconnect(String clientId, String roomCode) {
        RoomState room = getRoom(roomCode);
        if (room == null) {
            return null;
        }

        synchronized (room) {
            room.getParticipants().removeIf(participant -> Objects.equals(participant.getClientId(), clientId));

            if (room.getParticipants().isEmpty()) {
                rooms.remove(room.getRoomCode());
                return null;
            }

            if (Objects.equals(room.getHostClientId(), clientId)) {
                room.setHostClientId(room.getParticipants().get(0).getClientId());
                room.getParticipants().get(0).setSide("A");
                if (room.getParticipants().size() > 1) {
                    room.getParticipants().get(1).setSide("B");
                }
            }

            if ("playing".equals(room.getStatus()) && room.getParticipants().size() < 2) {
                room.setStatus("finished");
                if (room.getParticipants().size() == 1) {
                    room.getGameState().setWinner(room.getParticipants().get(0).getSide());
                    room.getGameState().setPhase("finished");
                }
            }

            return room;
        }
    }

    private KnockoutGameState createInitialState() {
        KnockoutGameState state = new KnockoutGameState();
        state.setCurrentPlayer("A");
        state.setPhase("aiming");
        state.setWinner(null);
        state.setTurnNumber(1);
        state.setPucks(createInitialPucks());
        return state;
    }

    private List<PuckState> createInitialPucks() {
        List<PuckState> pucks = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            pucks.add(new PuckState("A-" + (i + 1), "A", 170, 140 + i * 58, true));
        }
        for (int i = 0; i < 6; i++) {
            pucks.add(new PuckState("B-" + (i + 1), "B", 630, 140 + i * 58, true));
        }
        return pucks;
    }

    private KnockoutGameState copyState(KnockoutGameState source) {
        if (source == null) {
            return null;
        }

        KnockoutGameState copy = new KnockoutGameState();
        copy.setCurrentPlayer(source.getCurrentPlayer());
        copy.setPhase(source.getPhase());
        copy.setWinner(source.getWinner());
        copy.setTurnNumber(source.getTurnNumber());

        List<PuckState> puckCopies = new ArrayList<>();
        if (source.getPucks() != null) {
            for (PuckState puck : source.getPucks()) {
                puckCopies.add(new PuckState(
                    puck.getId(),
                    puck.getPlayer(),
                    puck.getX(),
                    puck.getY(),
                    puck.isActive()
                ));
            }
        }
        copy.setPucks(puckCopies);

        return copy;
    }

    @Override
    public String roomCodeOf(RoomState room) {
        return room != null ? room.getRoomCode() : null;
    }
}