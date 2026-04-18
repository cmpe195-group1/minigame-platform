package cmpe195.group1.minigameplatform.games.battleship.service;

import cmpe195.group1.minigameplatform.games.battleship.model.BattleshipRoom;
import cmpe195.group1.minigameplatform.multiplayer.util.RoomCodeUtils;
import lombok.Getter;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class BattleshipRoomService {

    @Getter
    public static class Dispatch {
        private final Map<String, List<Map<String, Object>>> outboundMessages = new LinkedHashMap<>();
        private String error;

        public static Dispatch ok() {
            return new Dispatch();
        }

        public static Dispatch error(String error) {
            Dispatch dispatch = new Dispatch();
            dispatch.error = error;
            return dispatch;
        }

        public boolean isOk() {
            return error == null;
        }

        public void addMessage(String clientToken, Map<String, Object> message) {
            outboundMessages.computeIfAbsent(clientToken, ignored -> new ArrayList<>()).add(message);
        }
    }

    private final Map<String, BattleshipRoom> rooms = new ConcurrentHashMap<>();

    public Dispatch createRoom(String clientToken, Map<String, Object> payload) {
        String roomId = normalizeRoomId(stringValue(payload, "roomId"));
        if (roomId.isBlank()) {
            return Dispatch.error("Room ID is required.");
        }

        int maxPlayers = clamp(intValue(payload, "maxPlayers", 2), 2, 4);
        BattleshipRoom room = new BattleshipRoom(roomId, maxPlayers);
        room.getPlayerTokens().set(0, clientToken);

        BattleshipRoom existing = rooms.putIfAbsent(roomId, room);
        if (existing != null) {
            return Dispatch.error("Room already exists.");
        }

        Dispatch dispatch = Dispatch.ok();
        dispatch.addMessage(clientToken, message("type", "room_created", "roomId", roomId));
        return dispatch;
    }

    public Dispatch joinRoom(String clientToken, Map<String, Object> payload) {
        String roomId = normalizeRoomId(stringValue(payload, "roomId"));
        BattleshipRoom room = rooms.get(roomId);
        if (room == null) {
            return Dispatch.error("Room not found.");
        }

        synchronized (room) {
            int existingIndex = room.getPlayerTokens().indexOf(clientToken);
            if (existingIndex >= 0) {
                return Dispatch.ok();
            }

            int emptySlot = room.getPlayerTokens().indexOf(null);
            if (emptySlot < 0) {
                return Dispatch.error("Room is full.");
            }

            room.getPlayerTokens().set(emptySlot, clientToken);

            Dispatch dispatch = Dispatch.ok();
            if (room.getMaxPlayers() == 2) {
                String hostToken = room.getPlayerTokens().get(0);
                if (hostToken == null) {
                    rooms.remove(roomId);
                    return Dispatch.error("Host is no longer available.");
                }

                dispatch.addMessage(hostToken, message("type", "join", "roomId", roomId));
                return dispatch;
            }

            int currentCount = connectedCount(room);
            Map<String, Object> joinMessage = message(
                "type", "player_joined",
                "roomId", roomId,
                "playerIndex", emptySlot,
                "currentCount", currentCount
            );

            forEachRecipient(room, (index, token) -> {
                if (token == null) {
                    return;
                }
                if (index == emptySlot) {
                    dispatch.addMessage(token, new LinkedHashMap<>(joinMessage));
                    return;
                }
                dispatch.addMessage(token, new LinkedHashMap<>(joinMessage));
            });

            return dispatch;
        }
    }

    public Dispatch relay(String clientToken, Map<String, Object> payload) {
        String roomId = normalizeRoomId(stringValue(payload, "roomId"));
        BattleshipRoom room = rooms.get(roomId);
        if (room == null) {
            return Dispatch.error("Room not found.");
        }

        synchronized (room) {
            int senderIndex = room.getPlayerTokens().indexOf(clientToken);
            if (senderIndex < 0) {
                return Dispatch.error("You are not in this room.");
            }

            Dispatch dispatch = Dispatch.ok();
            Map<String, Object> message = new LinkedHashMap<>(payload);
            message.put("roomId", roomId);
            String type = stringValue(message, "type");

            if (room.getMaxPlayers() == 2) {
                forEachRecipient(room, (index, token) -> {
                    if (token != null && index != senderIndex) {
                        dispatch.addMessage(token, new LinkedHashMap<>(message));
                    }
                });
                return dispatch;
            }

            if ("game_start_4p".equals(type)) {
                forEachRecipient(room, (index, token) -> {
                    if (token != null && index != senderIndex) {
                        Map<String, Object> personalized = new LinkedHashMap<>(message);
                        personalized.put("yourIndex", index);
                        dispatch.addMessage(token, personalized);
                    }
                });
                return dispatch;
            }

            forEachRecipient(room, (index, token) -> {
                if (token != null && index != senderIndex) {
                    dispatch.addMessage(token, new LinkedHashMap<>(message));
                }
            });
            return dispatch;
        }
    }

    public Dispatch disconnect(String clientToken, String roomId) {
        BattleshipRoom room = getRoomForClient(clientToken, roomId);
        if (room == null) {
            return Dispatch.ok();
        }

        synchronized (room) {
            int playerIndex = room.getPlayerTokens().indexOf(clientToken);
            if (playerIndex < 0) {
                return Dispatch.ok();
            }

            room.getPlayerTokens().set(playerIndex, null);

            Dispatch dispatch = Dispatch.ok();
            if (room.getMaxPlayers() == 2) {
                forEachRecipient(room, (index, token) -> {
                    if (token != null) {
                        dispatch.addMessage(token, message("type", "opponent_left", "roomId", room.getRoomId()));
                    }
                });
                rooms.remove(room.getRoomId());
                return dispatch;
            }

            forEachRecipient(room, (index, token) -> {
                if (token != null) {
                    dispatch.addMessage(token, message(
                        "type", "player_left_4p",
                        "roomId", room.getRoomId(),
                        "playerIndex", playerIndex
                    ));
                }
            });

            if (connectedCount(room) == 0) {
                rooms.remove(room.getRoomId());
            }
            return dispatch;
        }
    }

    private BattleshipRoom getRoomForClient(String clientToken, String roomId) {
        if (roomId != null && !roomId.isBlank()) {
            BattleshipRoom room = rooms.get(normalizeRoomId(roomId));
            if (room != null) {
                return room;
            }
        }

        for (BattleshipRoom room : rooms.values()) {
            if (room.getPlayerTokens().contains(clientToken)) {
                return room;
            }
        }
        return null;
    }

    private int connectedCount(BattleshipRoom room) {
        int count = 0;
        for (String token : room.getPlayerTokens()) {
            if (token != null) {
                count++;
            }
        }
        return count;
    }

    private void forEachRecipient(BattleshipRoom room, RecipientConsumer consumer) {
        for (int i = 0; i < room.getPlayerTokens().size(); i++) {
            consumer.accept(i, room.getPlayerTokens().get(i));
        }
    }

    private Map<String, Object> message(Object... keyValues) {
        Map<String, Object> message = new LinkedHashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            message.put((String) keyValues[i], keyValues[i + 1]);
        }
        return message;
    }

    private int clamp(int value, int min, int max) {
        return Math.min(Math.max(value, min), max);
    }

    private String stringValue(Map<String, Object> payload, String key) {
        if (payload == null) {
            return null;
        }
        Object value = payload.get(key);
        return value != null ? value.toString() : null;
    }

    private int intValue(Map<String, Object> payload, String key, int defaultValue) {
        if (payload == null) {
            return defaultValue;
        }
        Object value = payload.get(key);
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Integer.parseInt(text);
            } catch (NumberFormatException ignored) {
                return defaultValue;
            }
        }
        return defaultValue;
    }

    private String normalizeRoomId(String roomId) {
        return RoomCodeUtils.normalize(roomId);
    }

    @FunctionalInterface
    private interface RecipientConsumer {
        void accept(int index, String clientToken);
    }
}
