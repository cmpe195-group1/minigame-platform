package cmpe195.group1.minigameplatform.games.battleship.service;

import cmpe195.group1.minigameplatform.games.battleship.model.BattleshipRoom;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class BattleshipRoomServiceTest {

    private BattleshipRoomService service;

    @BeforeEach
    void setUp() {
        service = new BattleshipRoomService();
    }

    @Test
    void createRoom_validatesRoomIdAndRejectsDuplicates() {
        BattleshipRoomService.Dispatch missingRoom = service.createRoom("host", Map.of());
        BattleshipRoomService.Dispatch created = service.createRoom("host", Map.of("roomId", " room1 ", "maxPlayers", 2));
        BattleshipRoomService.Dispatch duplicate = service.createRoom("other", Map.of("roomId", "ROOM1"));

        assertThat(missingRoom.isOk()).isFalse();
        assertThat(missingRoom.getError()).isEqualTo("Room ID is required.");
        assertThat(created.isOk()).isTrue();
        assertThat(created.getOutboundMessages()).containsKey("host");
        assertSingleMessage(created.getOutboundMessages().get("host"), Map.of("type", "room_created", "roomId", "ROOM1"));
        assertThat(duplicate.isOk()).isFalse();
        assertThat(duplicate.getError()).isEqualTo("Room already exists.");
    }

    @Test
    void createRoom_parsesAndClampsMaxPlayersFromDifferentPayloadShapes() {
        BattleshipRoomService.Dispatch nullPayload = service.createRoom("host-null", null);
        BattleshipRoomService.Dispatch blankMax = service.createRoom("host-blank", Map.of("roomId", "room-blank", "maxPlayers", "   "));
        BattleshipRoomService.Dispatch invalidText = service.createRoom("host-invalid", Map.of("roomId", "room-invalid", "maxPlayers", "oops"));
        BattleshipRoomService.Dispatch stringNumber = service.createRoom("host-string", Map.of("roomId", "room-string", "maxPlayers", "3"));
        BattleshipRoomService.Dispatch clampedHigh = service.createRoom("host-high", Map.of("roomId", "room-high", "maxPlayers", 99));

        assertThat(nullPayload.isOk()).isFalse();
        assertThat(blankMax.isOk()).isTrue();
        assertSingleMessage(blankMax.getOutboundMessages().get("host-blank"), Map.of("roomId", "ROOM-BLANK"));
        assertThat(invalidText.isOk()).isTrue();
        assertSingleMessage(invalidText.getOutboundMessages().get("host-invalid"), Map.of("roomId", "ROOM-INVALID"));
        assertThat(stringNumber.isOk()).isTrue();
        assertThat(clampedHigh.isOk()).isTrue();

        assertThat(service.joinRoom("string-guest-1", Map.of("roomId", "room-string")).isOk()).isTrue();
        assertThat(service.joinRoom("string-guest-2", Map.of("roomId", "room-string")).isOk()).isTrue();
        assertThat(service.joinRoom("string-guest-3", Map.of("roomId", "room-string")).getError()).isEqualTo("Room is full.");

        BattleshipRoomService.Dispatch joinedThird = service.joinRoom("guest-high-1", Map.of("roomId", "room-high"));
        BattleshipRoomService.Dispatch joinedFourth = service.joinRoom("guest-high-2", Map.of("roomId", "room-high"));
        BattleshipRoomService.Dispatch joinedFifth = service.joinRoom("guest-high-3", Map.of("roomId", "room-high"));
        BattleshipRoomService.Dispatch roomFull = service.joinRoom("guest-high-4", Map.of("roomId", "room-high"));

        assertThat(joinedThird.isOk()).isTrue();
        assertThat(joinedFourth.isOk()).isTrue();
        assertThat(joinedFifth.isOk()).isTrue();
        assertThat(roomFull.getError()).isEqualTo("Room is full.");
    }

    @Test
    void joinRoom_notifiesHostForTwoPlayerRoom() {
        service.createRoom("host", Map.of("roomId", "room2", "maxPlayers", 2));

        BattleshipRoomService.Dispatch dispatch = service.joinRoom("guest", Map.of("roomId", "ROOM2"));

        assertThat(dispatch.isOk()).isTrue();
        assertThat(dispatch.getOutboundMessages()).containsOnlyKeys("host");
        assertSingleMessage(dispatch.getOutboundMessages().get("host"), Map.of("type", "join", "roomId", "ROOM2"));
    }

    @Test
    void joinRoom_handlesMissingAndDuplicateClientBranches() {
        assertThat(service.joinRoom("ghost", Map.of("roomId", "missing")).getError()).isEqualTo("Room not found.");

        service.createRoom("host", Map.of("roomId", "room-dup", "maxPlayers", 2));

        BattleshipRoomService.Dispatch duplicateJoin = service.joinRoom("host", Map.of("roomId", "room-dup"));

        assertThat(duplicateJoin.isOk()).isTrue();
        assertThat(duplicateJoin.getOutboundMessages()).isEmpty();
    }

    @Test
    void joinRoom_returnsErrorWhenTwoPlayerHostTokenIsMissing() throws Exception {
        service.createRoom("host", Map.of("roomId", "room-host-missing", "maxPlayers", 2));
        BattleshipRoom room = rooms().get("ROOM-HOST-MISSING");
        setPlayerTokens(room, new java.util.AbstractList<>() {
            private final java.util.List<String> delegate = new java.util.ArrayList<>(java.util.Arrays.asList("placeholder-host", null));

            @Override
            public String get(int index) {
                return index == 0 ? null : delegate.get(index);
            }

            @Override
            public int size() {
                return delegate.size();
            }

            @Override
            public String set(int index, String element) {
                return delegate.set(index, element);
            }

            @Override
            public int indexOf(Object o) {
                return o == null ? 1 : delegate.indexOf(o);
            }
        });

        BattleshipRoomService.Dispatch dispatch = service.joinRoom("guest", Map.of("roomId", "ROOM-HOST-MISSING"));

        assertThat(dispatch.getError()).isEqualTo("Host is no longer available.");
        assertThat(service.joinRoom("guest-2", Map.of("roomId", "ROOM-HOST-MISSING")).getError()).isEqualTo("Room not found.");
    }

    @Test
    void joinRoom_broadcastsJoinedPlayerForFourPlayerRoom() {
        service.createRoom("host", Map.of("roomId", "room3", "maxPlayers", 4));

        BattleshipRoomService.Dispatch firstJoin = service.joinRoom("guest-1", Map.of("roomId", "ROOM3"));
        BattleshipRoomService.Dispatch secondJoin = service.joinRoom("guest-2", Map.of("roomId", "ROOM3"));

        assertThat(firstJoin.getOutboundMessages()).containsKeys("host", "guest-1");
        assertSingleMessage(firstJoin.getOutboundMessages().get("host"), Map.of(
            "type", "player_joined",
            "playerIndex", 1,
            "currentCount", 2
        ));
        assertThat(secondJoin.getOutboundMessages()).containsKeys("host", "guest-1", "guest-2");
        assertSingleMessage(secondJoin.getOutboundMessages().get("guest-2"), Map.of("playerIndex", 2, "currentCount", 3));
    }

    @Test
    void relay_sendsToOpponentOnlyInTwoPlayerRoom() {
        service.createRoom("host", Map.of("roomId", "room4", "maxPlayers", 2));
        service.joinRoom("guest", Map.of("roomId", "ROOM4"));

        BattleshipRoomService.Dispatch dispatch = service.relay("host", Map.of("roomId", "room4", "type", "attack", "x", 4));

        assertThat(dispatch.isOk()).isTrue();
        assertThat(dispatch.getOutboundMessages()).containsOnlyKeys("guest");
        assertSingleMessage(dispatch.getOutboundMessages().get("guest"), Map.of("type", "attack", "roomId", "ROOM4", "x", 4));
    }

    @Test
    void relay_handlesMissingRoomAndUnknownSender() {
        assertThat(service.relay("ghost", Map.of("roomId", "missing", "type", "attack")).getError()).isEqualTo("Room not found.");

        service.createRoom("host", Map.of("roomId", "room-unknown", "maxPlayers", 2));

        assertThat(service.relay("ghost", Map.of("roomId", "room-unknown", "type", "attack")).getError())
            .isEqualTo("You are not in this room.");
    }

    @Test
    void relay_inTwoPlayerRoomWithNoOpponentProducesNoOutboundMessages() {
        service.createRoom("host", Map.of("roomId", "room-solo", "maxPlayers", 2));

        BattleshipRoomService.Dispatch dispatch = service.relay("host", Map.of("roomId", "room-solo", "type", "attack", "x", 1));

        assertThat(dispatch.isOk()).isTrue();
        assertThat(dispatch.getOutboundMessages()).isEmpty();
    }

    @Test
    void relay_personalizesGameStartForFourPlayerRoom() {
        service.createRoom("host", Map.of("roomId", "room5", "maxPlayers", 4));
        service.joinRoom("guest-1", Map.of("roomId", "room5"));
        service.joinRoom("guest-2", Map.of("roomId", "room5"));

        BattleshipRoomService.Dispatch dispatch = service.relay("host", Map.of("roomId", "ROOM5", "type", "game_start_4p"));

        assertThat(dispatch.getOutboundMessages()).containsKeys("guest-1", "guest-2");
        assertSingleMessage(dispatch.getOutboundMessages().get("guest-1"), Map.of("yourIndex", 1));
        assertSingleMessage(dispatch.getOutboundMessages().get("guest-2"), Map.of("yourIndex", 2));
    }

    @Test
    void relay_broadcastsRegularMessagesForFourPlayerRooms() {
        service.createRoom("host", Map.of("roomId", "room5b", "maxPlayers", 4));
        service.joinRoom("guest-1", Map.of("roomId", "room5b"));
        service.joinRoom("guest-2", Map.of("roomId", "room5b"));

        BattleshipRoomService.Dispatch dispatch = service.relay("host", Map.of("roomId", "ROOM5B", "type", "sync", "state", "ready"));

        assertThat(dispatch.getOutboundMessages()).containsOnlyKeys("guest-1", "guest-2");
        assertSingleMessage(dispatch.getOutboundMessages().get("guest-1"), Map.of("type", "sync", "roomId", "ROOM5B", "state", "ready"));
        assertSingleMessage(dispatch.getOutboundMessages().get("guest-2"), Map.of("type", "sync", "roomId", "ROOM5B", "state", "ready"));
    }

    @Test
    void disconnect_notifiesRemainingPlayers() {
        service.createRoom("host", Map.of("roomId", "room6", "maxPlayers", 2));
        service.joinRoom("guest", Map.of("roomId", "ROOM6"));

        BattleshipRoomService.Dispatch twoPlayerDispatch = service.disconnect("guest", "room6");

        assertThat(twoPlayerDispatch.getOutboundMessages()).containsOnlyKeys("host");
        assertSingleMessage(twoPlayerDispatch.getOutboundMessages().get("host"), Map.of("type", "opponent_left", "roomId", "ROOM6"));

        service.createRoom("host4", Map.of("roomId", "room7", "maxPlayers", 4));
        service.joinRoom("guest4-1", Map.of("roomId", "ROOM7"));
        service.joinRoom("guest4-2", Map.of("roomId", "ROOM7"));

        BattleshipRoomService.Dispatch fourPlayerDispatch = service.disconnect("guest4-1", "room7");

        assertThat(fourPlayerDispatch.getOutboundMessages().keySet()).containsExactlyInAnyOrder("host4", "guest4-2");
        List<Map<String, Object>> messages = new ArrayList<>();
        fourPlayerDispatch.getOutboundMessages().values().forEach(messages::addAll);
        assertThat(messages).hasSize(2);
        messages.forEach(message -> assertThat(message)
            .containsEntry("type", "player_left_4p")
            .containsEntry("roomId", "ROOM7")
            .containsEntry("playerIndex", 1));
    }

    @Test
    void disconnect_handlesUnknownClientBlankRoomLookupAndEmptyFourPlayerRoomCleanup() {
        assertThat(service.disconnect("ghost", "missing").isOk()).isTrue();

        service.createRoom("other-host", Map.of("roomId", "other-room", "maxPlayers", 2));
        assertThat(service.disconnect("ghost", "missing").isOk()).isTrue();

        service.createRoom("host", Map.of("roomId", "room-search", "maxPlayers", 2));
        service.joinRoom("guest", Map.of("roomId", "ROOM-SEARCH"));

        BattleshipRoomService.Dispatch byLookup = service.disconnect("guest", "");

        assertThat(byLookup.getOutboundMessages()).containsOnlyKeys("host");
        assertSingleMessage(byLookup.getOutboundMessages().get("host"), Map.of("type", "opponent_left", "roomId", "ROOM-SEARCH"));

        service.createRoom("host-fallback", Map.of("roomId", "room-fallback", "maxPlayers", 2));
        service.joinRoom("guest-fallback", Map.of("roomId", "ROOM-FALLBACK"));

        BattleshipRoomService.Dispatch fallbackLookup = service.disconnect("guest-fallback", "missing-room-id");

        assertThat(fallbackLookup.getOutboundMessages()).containsOnlyKeys("host-fallback");
        assertSingleMessage(fallbackLookup.getOutboundMessages().get("host-fallback"), Map.of("type", "opponent_left", "roomId", "ROOM-FALLBACK"));

        service.createRoom("host4", Map.of("roomId", "room-empty", "maxPlayers", 4));

        BattleshipRoomService.Dispatch unknownClient = service.disconnect("outsider", "room-empty");
        BattleshipRoomService.Dispatch removedHost = service.disconnect("host4", "room-empty");
        BattleshipRoomService.Dispatch missingAfterRemoval = service.joinRoom("guest-after", Map.of("roomId", "room-empty"));

        assertThat(unknownClient.isOk()).isTrue();
        assertThat(unknownClient.getOutboundMessages()).isEmpty();
        assertThat(removedHost.isOk()).isTrue();
        assertThat(missingAfterRemoval.getError()).isEqualTo("Room not found.");
    }

    @Test
    void createRoom_privateIntValueReturnsDefaultForNullPayload() throws Exception {
        java.lang.reflect.Method method = BattleshipRoomService.class.getDeclaredMethod("intValue", Map.class, String.class, int.class);
        method.setAccessible(true);

        int result = (int) method.invoke(service, null, "maxPlayers", 7);

        assertThat(result).isEqualTo(7);
    }

    private void assertSingleMessage(List<Map<String, Object>> messages, Map<String, Object> expectedEntries) {
        assertThat(messages).singleElement().satisfies(message -> assertThat(message).containsAllEntriesOf(expectedEntries));
    }

    @SuppressWarnings("unchecked")
    private Map<String, BattleshipRoom> rooms() throws Exception {
        Field field = BattleshipRoomService.class.getDeclaredField("rooms");
        field.setAccessible(true);
        return (Map<String, BattleshipRoom>) field.get(service);
    }

    private void setPlayerTokens(BattleshipRoom room, List<String> playerTokens) throws Exception {
        Field field = BattleshipRoom.class.getDeclaredField("playerTokens");
        field.setAccessible(true);
        field.set(room, playerTokens);
    }
}


