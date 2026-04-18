package cmpe195.group1.minigameplatform.multiplayer.websocket;

import cmpe195.group1.minigameplatform.multiplayer.payload.CreateRoomRequest;
import cmpe195.group1.minigameplatform.multiplayer.payload.RoomScopedPayload;
import cmpe195.group1.minigameplatform.multiplayer.payload.RoomServerMessage;
import cmpe195.group1.minigameplatform.multiplayer.service.RoomActionResult;
import cmpe195.group1.minigameplatform.multiplayer.service.SnapshotRoomService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.invocation.Invocation;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.List;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class AbstractSnapshotRoomStompControllerTest {

    private SimpMessagingTemplate messagingTemplate;
    private SnapshotRoomService<String> roomService;
    private StompSessionRegistry sessionRegistry;
    private TestSnapshotController controller;

    @BeforeEach
    void setUp() {
        messagingTemplate = mock(SimpMessagingTemplate.class);
        @SuppressWarnings("unchecked")
        SnapshotRoomService<String> mockedRoomService = mock(SnapshotRoomService.class);
        roomService = mockedRoomService;
        sessionRegistry = new StompSessionRegistry();
        controller = new TestSnapshotController(roomService, messagingTemplate, sessionRegistry);
    }

    @Test
    void handleCreateRoom_ignoresMissingSessionOrBlankToken() {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setClientToken("   ");

        controller.create(request, headers("session-1"));
        controller.create(requestWithToken("client-1"), null);
        controller.create(null, headers("session-2"));

        verifyNoInteractions(roomService, messagingTemplate);
        assertThat(sessionRegistry.getClientToken("session-1")).isNull();
    }

    @Test
    void handleCreateRoom_bindsSessionEvenWhenServiceReturnsNullRoom() {
        CreateRoomRequest request = requestWithToken("client-1");
        when(roomService.createRoom("client-1", request)).thenReturn(null);

        controller.create(request, headers("session-1"));

        StompSessionRegistry.SessionInfo info = sessionRegistry.remove("session-1");
        assertThat(info.getClientToken()).isEqualTo("client-1");
        assertThat(info.getRoomCode()).isNull();
        verify(roomService).createRoom("client-1", request);
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    void handleCreateRoom_remembersRoomAndSendsState() {
        CreateRoomRequest request = requestWithToken("client-1");
        when(roomService.createRoom("client-1", request)).thenReturn("room-1");
        when(roomService.roomCodeOf("room-1")).thenReturn("ROOM1");

        controller.create(request, headers("session-1"));

        StompSessionRegistry.SessionInfo info = sessionRegistry.remove("session-1");
        assertThat(info.getClientToken()).isEqualTo("client-1");
        assertThat(info.getRoomCode()).isEqualTo("ROOM1");

        verify(messagingTemplate).convertAndSend(eq("/topic/test-game/client/client-1"), any(RoomServerMessage.class));
        verifyRoomStateMessageSent("/topic/test-game/client/client-1", "ROOM_STATE", "room-1", null);
    }

    @Test
    void handleJoinRoom_ignoresMissingSessionOrBlankToken() {
        RoomScopedPayload.JoinRoomRequest request = new RoomScopedPayload.JoinRoomRequest();
        request.setClientToken(" ");

        controller.join(request, headers("session-1"));
        controller.join(joinRequest("client-1"), null);
        controller.join(null, headers("session-2"));

        verifyNoInteractions(roomService, messagingTemplate);
    }

    @Test
    void handleJoinRoom_stopsWhenServiceReturnsNull() {
        RoomScopedPayload.JoinRoomRequest request = joinRequest("client-1");
        when(roomService.joinRoom("client-1", request)).thenReturn(null);

        controller.join(request, headers("session-1"));

        StompSessionRegistry.SessionInfo info = sessionRegistry.remove("session-1");
        assertThat(info.getClientToken()).isEqualTo("client-1");
        assertThat(info.getRoomCode()).isNull();
        verify(roomService).joinRoom("client-1", request);
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    void handleJoinRoom_sendsJoinErrorForFailedResult() {
        RoomScopedPayload.JoinRoomRequest request = joinRequest("client-1");
        when(roomService.joinRoom("client-1", request)).thenReturn(RoomActionResult.error("room full"));

        controller.join(request, headers("session-1"));

        StompSessionRegistry.SessionInfo info = sessionRegistry.remove("session-1");
        assertThat(info.getClientToken()).isEqualTo("client-1");
        assertThat(info.getRoomCode()).isNull();
        verifyJoinErrorMessageSent("/topic/test-game/client/client-1", "room full");
    }

    @Test
    void handleJoinRoom_stopsForSuccessfulResultWithoutRoom() {
        RoomScopedPayload.JoinRoomRequest request = joinRequest("client-1");
        when(roomService.joinRoom("client-1", request)).thenReturn(RoomActionResult.ok(null));

        controller.join(request, headers("session-1"));

        StompSessionRegistry.SessionInfo info = sessionRegistry.remove("session-1");
        assertThat(info.getClientToken()).isEqualTo("client-1");
        assertThat(info.getRoomCode()).isNull();
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    void handleJoinRoom_sendsClientStateAndBroadcastsRoom() {
        RoomScopedPayload.JoinRoomRequest request = joinRequest("client-1");
        when(roomService.joinRoom("client-1", request)).thenReturn(RoomActionResult.ok("room-1"));
        when(roomService.roomCodeOf("room-1")).thenReturn("ROOM1");

        controller.join(request, headers("session-1"));

        StompSessionRegistry.SessionInfo info = sessionRegistry.remove("session-1");
        assertThat(info.getRoomCode()).isEqualTo("ROOM1");

        verify(messagingTemplate, times(2)).convertAndSend(anyString(), any(Object.class));
        verifyMessages(List.of("/topic/test-game/client/client-1", "/topic/test-game/room/ROOM1"), "ROOM_STATE", "room-1", null);
    }

    @Test
    void handleLeaveRoom_requiresBoundClientSession() {
        controller.leave(new RoomScopedPayload.RoomCodeRequest(), headers("session-1"));
        controller.leave(null, headers("session-2"));

        verifyNoInteractions(roomService, messagingTemplate);
    }

    @Test
    void rememberAndClearRoomCode_ignoreNullSessionIds() {
        controller.remember(null, "ROOM1");
        controller.clear(null);

        assertThat(sessionRegistry.getClientToken("missing")).isNull();
        verifyNoInteractions(messagingTemplate, roomService);
    }

    @Test
    void handleLeaveRoom_clearsRoomCodeEvenWhenDisconnectReturnsNull() {
        sessionRegistry.bindClient("session-1", "client-1");
        sessionRegistry.setRoomCode("session-1", "OLD");
        RoomScopedPayload.RoomCodeRequest request = new RoomScopedPayload.RoomCodeRequest();
        request.setRoomId("room-from-id");
        when(roomService.disconnect("client-1", "room-from-id")).thenReturn(null);

        controller.leave(request, headers("session-1"));

        StompSessionRegistry.SessionInfo info = sessionRegistry.remove("session-1");
        assertThat(info.getRoomCode()).isNull();
        verify(roomService).disconnect("client-1", "room-from-id");
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    void handleLeaveRoom_usesNullRoomCodeWhenPayloadIsMissingForBoundSession() {
        sessionRegistry.bindClient("session-2", "client-2");
        sessionRegistry.setRoomCode("session-2", "OLD");
        when(roomService.disconnect("client-2", null)).thenReturn(null);

        controller.leave(null, headers("session-2"));

        StompSessionRegistry.SessionInfo info = sessionRegistry.remove("session-2");
        assertThat(info.getRoomCode()).isNull();
        verify(roomService).disconnect("client-2", null);
    }

    @Test
    void handleLeaveRoom_broadcastsUpdatedRoomWhenDisconnectReturnsState() {
        sessionRegistry.bindClient("session-1", "client-1");
        sessionRegistry.setRoomCode("session-1", "OLD");
        RoomScopedPayload.RoomCodeRequest request = new RoomScopedPayload.RoomCodeRequest();
        request.setRoomCode("ROOM1");
        when(roomService.disconnect("client-1", "ROOM1")).thenReturn("room-1");
        when(roomService.roomCodeOf("room-1")).thenReturn("ROOM1");

        controller.leave(request, headers("session-1"));

        verifyRoomStateMessageSent("/topic/test-game/room/ROOM1", "ROOM_STATE", "room-1", null);
    }

    @Test
    void handleSnapshotAction_requiresBoundClient() {
        @SuppressWarnings("unchecked")
        Function<String, String> action = mock(Function.class);

        controller.snapshot(headers("session-1"), action);

        verifyNoInteractions(action, messagingTemplate, roomService);
    }

    @Test
    void handleSnapshotAction_ignoresNullRoomResult() {
        sessionRegistry.bindClient("session-1", "client-1");
        @SuppressWarnings("unchecked")
        Function<String, String> action = mock(Function.class);
        when(action.apply("client-1")).thenReturn(null);

        controller.snapshot(headers("session-1"), action);

        verify(action).apply("client-1");
        verifyNoInteractions(messagingTemplate, roomService);
    }

    @Test
    void handleSnapshotAction_broadcastsReturnedRoom() {
        sessionRegistry.bindClient("session-1", "client-1");
        @SuppressWarnings("unchecked")
        Function<String, String> action = mock(Function.class);
        when(action.apply("client-1")).thenReturn("room-1");
        when(roomService.roomCodeOf("room-1")).thenReturn("ROOM1");

        controller.snapshot(headers("session-1"), action);

        verify(action).apply("client-1");
        verifyRoomStateMessageSent("/topic/test-game/room/ROOM1", "ROOM_STATE", "room-1", null);
    }

    @Test
    void handleRoomActionResultFromHeaders_requiresBoundClient() {
        @SuppressWarnings("unchecked")
        Function<String, RoomActionResult<String>> action = mock(Function.class);

        controller.resultFromHeaders(headers("session-1"), action);

        verifyNoInteractions(action, messagingTemplate, roomService);
    }

    @Test
    void handleRoomActionResultFromHeaders_sendsErrorForFailedResult() {
        sessionRegistry.bindClient("session-1", "client-1");
        @SuppressWarnings("unchecked")
        Function<String, RoomActionResult<String>> action = mock(Function.class);
        when(action.apply("client-1")).thenReturn(RoomActionResult.error("bad move"));

        controller.resultFromHeaders(headers("session-1"), action);

        verify(action).apply("client-1");
        verifyErrorMessageSent("/topic/test-game/client/client-1", "bad move");
    }

    @Test
    void handleRoomActionResultFromHeaders_ignoresSuccessfulResultWithoutRoom() {
        sessionRegistry.bindClient("session-1", "client-1");
        @SuppressWarnings("unchecked")
        Function<String, RoomActionResult<String>> action = mock(Function.class);
        when(action.apply("client-1")).thenReturn(RoomActionResult.ok(null));

        controller.resultFromHeaders(headers("session-1"), action);

        verify(action).apply("client-1");
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    void handleRoomActionResultDirect_ignoresNullInputs() {
        controller.resultDirect(null, RoomActionResult.ok("room-1"));
        controller.resultDirect("client-1", null);

        verifyNoInteractions(messagingTemplate, roomService);
    }

    @Test
    void handleRoomActionResultDirect_broadcastsSuccessfulRoom() {
        when(roomService.roomCodeOf("room-1")).thenReturn("ROOM1");

        controller.resultDirect("client-1", RoomActionResult.ok("room-1"));

        verifyRoomStateMessageSent("/topic/test-game/room/ROOM1", "ROOM_STATE", "room-1", null);
    }

    @Test
    void handleDisconnect_ignoresUnknownOrIncompleteSessions() {
        SessionDisconnectEvent unknownEvent = disconnectEvent("unknown");
        controller.disconnect(unknownEvent);

        sessionRegistry.bindClient("session-1", null);
        sessionRegistry.setRoomCode("session-1", "ROOM1");
        controller.disconnect(disconnectEvent("session-1"));

        sessionRegistry.bindClient("session-2", "client-2");
        controller.disconnect(disconnectEvent("session-2"));

        verifyNoInteractions(roomService, messagingTemplate);
    }

    @Test
    void handleDisconnect_broadcastsUpdatedRoomWhenPresent() {
        sessionRegistry.bindClient("session-1", "client-1");
        sessionRegistry.setRoomCode("session-1", "ROOM1");
        when(roomService.disconnect("client-1", "ROOM1")).thenReturn("room-1");
        when(roomService.roomCodeOf("room-1")).thenReturn("ROOM1");

        controller.disconnect(disconnectEvent("session-1"));

        verify(roomService).disconnect("client-1", "ROOM1");
        verifyRoomStateMessageSent("/topic/test-game/room/ROOM1", "ROOM_STATE", "room-1", null);
    }

    @Test
    void handleDisconnect_stopsWhenServiceReturnsNullForCompleteSession() {
        sessionRegistry.bindClient("session-3", "client-3");
        sessionRegistry.setRoomCode("session-3", "ROOM3");
        when(roomService.disconnect("client-3", "ROOM3")).thenReturn(null);

        controller.disconnect(disconnectEvent("session-3"));

        verify(roomService).disconnect("client-3", "ROOM3");
        verifyNoInteractions(messagingTemplate);
    }

    private SimpMessageHeaderAccessor headers(String sessionId) {
        SimpMessageHeaderAccessor headers = mock(SimpMessageHeaderAccessor.class);
        when(headers.getSessionId()).thenReturn(sessionId);
        return headers;
    }

    private SessionDisconnectEvent disconnectEvent(String sessionId) {
        SessionDisconnectEvent event = mock(SessionDisconnectEvent.class);
        when(event.getSessionId()).thenReturn(sessionId);
        return event;
    }

    private CreateRoomRequest requestWithToken(String clientToken) {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setClientToken(clientToken);
        return request;
    }

    private RoomScopedPayload.JoinRoomRequest joinRequest(String clientToken) {
        RoomScopedPayload.JoinRoomRequest request = new RoomScopedPayload.JoinRoomRequest();
        request.setClientToken(clientToken);
        return request;
    }

    private void verifyJoinErrorMessageSent(String destination, String error) {
        verifyMessage(destination, "JOIN_ERROR", null, error);
    }

    private void verifyErrorMessageSent(String destination, String error) {
        verifyMessage(destination, "ERROR", null, error);
    }

    private void verifyRoomStateMessageSent(String destination, String type, String roomState, String error) {
        verifyMessage(destination, type, roomState, error);
    }

    private void verifyMessage(String destination, String type, String roomState, String error) {
        verify(messagingTemplate).convertAndSend(eq(destination), any(RoomServerMessage.class));
        Object payload = mockingDetails(messagingTemplate)
                .getInvocations()
                .stream()
                .filter(invocation -> invocation.getMethod().getName().equals("convertAndSend"))
                .map(invocation -> invocation.getArguments()[1])
                .reduce((ignored, second) -> second)
                .orElseThrow();
        assertServerMessage(payload, type, roomState, error);
    }

    private void verifyMessages(List<String> destinations, String type, String roomState, String error) {
        List<Invocation> invocations = mockingDetails(messagingTemplate)
                .getInvocations()
                .stream()
                .filter(invocation -> invocation.getMethod().getName().equals("convertAndSend"))
                .toList();

        assertThat(invocations).hasSize(destinations.size());
        for (int i = 0; i < destinations.size(); i++) {
            Object[] arguments = ((org.mockito.invocation.Invocation) invocations.get(i)).getArguments();
            assertThat(arguments[0]).isEqualTo(destinations.get(i));
            assertServerMessage(arguments[1], type, roomState, error);
        }
    }

    private void assertServerMessage(Object payload, String type, String roomState, String error) {
        assertThat(payload).isInstanceOf(RoomServerMessage.class);
        RoomServerMessage<?> message = (RoomServerMessage<?>) payload;
        assertThat(message.getType()).isEqualTo(type);
        assertThat(message.getRoomState()).isEqualTo(roomState);
        assertThat(message.getError()).isEqualTo(error);
    }

    private static final class TestSnapshotController extends AbstractSnapshotRoomStompController<String> {

        private TestSnapshotController(
                SnapshotRoomService<String> roomService,
                SimpMessagingTemplate messagingTemplate,
                StompSessionRegistry sessionRegistry
        ) {
            super("test-game", roomService, messagingTemplate, sessionRegistry);
        }

        private void create(CreateRoomRequest payload, SimpMessageHeaderAccessor headers) {
            handleCreateRoom(payload, headers);
        }

        private void join(RoomScopedPayload.JoinRoomRequest payload, SimpMessageHeaderAccessor headers) {
            handleJoinRoom(payload, headers);
        }

        private void leave(RoomScopedPayload.RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
            handleLeaveRoom(payload, headers);
        }

        private void snapshot(SimpMessageHeaderAccessor headers, Function<String, String> action) {
            handleSnapshotAction(headers, action);
        }

        private void resultFromHeaders(
                SimpMessageHeaderAccessor headers,
                Function<String, RoomActionResult<String>> action
        ) {
            handleRoomActionResult(headers, action);
        }

        private void resultDirect(String clientToken, RoomActionResult<String> result) {
            handleRoomActionResult(clientToken, result);
        }

        private void disconnect(SessionDisconnectEvent event) {
            handleDisconnect(event);
        }

        private void remember(String sessionId, String roomCode) {
            rememberRoomCode(sessionId, roomCode);
        }

        private void clear(String sessionId) {
            clearRoomCode(sessionId);
        }
    }
}


