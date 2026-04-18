package cmpe195.group1.minigameplatform.games.battleship.websocket;

import cmpe195.group1.minigameplatform.games.battleship.service.BattleshipRoomService;
import cmpe195.group1.minigameplatform.multiplayer.websocket.StompSessionRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class BattleshipStompControllerTest {

    private BattleshipRoomService roomService;
    private SimpMessagingTemplate messagingTemplate;
    private StompSessionRegistry sessionRegistry;
    private BattleshipStompController controller;

    @BeforeEach
    void setUp() {
        roomService = mock(BattleshipRoomService.class);
        messagingTemplate = mock(SimpMessagingTemplate.class);
        sessionRegistry = new StompSessionRegistry();
        controller = new BattleshipStompController(roomService, messagingTemplate, sessionRegistry);
    }

    @Test
    void handleMessage_ignoresMissingTypeOrClientToken() {
        controller.handleMessage(Map.of(), headers("session-1"));
        controller.handleMessage(Map.of("type", "create_room"), headers("session-2"));
        controller.handleMessage(null, headers("session-3"));

        verifyNoInteractions(roomService, messagingTemplate);
        assertThat(sessionRegistry.getClientToken("session-1")).isNull();
        assertThat(sessionRegistry.getClientToken("session-2")).isNull();
    }

    @Test
    void handleMessage_ignoresNullSessionOrBlankType() {
        controller.handleMessage(Map.of("type", "create_room", "clientToken", "client-1"), headers(null));
        controller.handleMessage(Map.of("type", "   ", "clientToken", "client-1"), headers("session-1"));

        verifyNoInteractions(roomService, messagingTemplate);
    }

    @Test
    void handleMessage_bindsSessionStoresRoomCodeAndDispatchesSuccess() {
        BattleshipRoomService.Dispatch dispatch = BattleshipRoomService.Dispatch.ok();
        dispatch.addMessage("client-1", Map.of("type", "room_created", "roomId", "ROOM1"));
        when(roomService.createRoom(eq("client-1"), any())).thenReturn(dispatch);

        controller.handleMessage(Map.of("type", "create_room", "clientToken", "client-1", "roomId", " room1 "), headers("session-1"));

        verify(roomService).createRoom(eq("client-1"), any());
        verify(messagingTemplate).convertAndSend(eq("/topic/battleship/client/client-1"), any(Object.class));
        assertThat(sessionRegistry.getClientToken("session-1")).isEqualTo("client-1");
        assertThat(sessionRegistry.remove("session-1").getRoomCode()).isEqualTo("ROOM1");
    }

    @Test
    void handleMessage_routesJoinRequestsAndStoresNormalizedRoomCode() {
        BattleshipRoomService.Dispatch dispatch = BattleshipRoomService.Dispatch.ok();
        dispatch.addMessage("host", Map.of("type", "join", "roomId", "ROOM2"));
        when(roomService.joinRoom(eq("client-2"), any())).thenReturn(dispatch);

        controller.handleMessage(Map.of("type", "join", "clientToken", "client-2", "roomId", " room2 "), headers("session-2"));

        verify(roomService).joinRoom(eq("client-2"), any());
        assertThat(sessionRegistry.remove("session-2").getRoomCode()).isEqualTo("ROOM2");
    }

    @Test
    void handleMessage_sendsErrorsToBoundClient() {
        when(roomService.createRoom(eq("client-1"), any())).thenReturn(BattleshipRoomService.Dispatch.error("duplicate"));

        controller.handleMessage(Map.of("type", "create_room", "clientToken", "client-1", "roomId", "ROOM1"), headers("session-1"));

        verify(messagingTemplate).convertAndSend(eq("/topic/battleship/client/client-1"), any(Object.class));
        assertThat(sessionRegistry.remove("session-1").getRoomCode()).isNull();
    }

    @Test
    void handleMessage_relaysMessagesForBoundSession() {
        sessionRegistry.bindClient("session-1", "client-1");
        BattleshipRoomService.Dispatch dispatch = BattleshipRoomService.Dispatch.ok();
        dispatch.addMessage("client-2", Map.of("type", "attack", "roomId", "ROOM2"));
        when(roomService.relay(eq("client-1"), any())).thenReturn(dispatch);

        controller.handleMessage(Map.of("type", "attack", "roomId", "ROOM2"), headers("session-1"));

        verify(roomService).relay(eq("client-1"), any());
        verify(messagingTemplate).convertAndSend(eq("/topic/battleship/client/client-2"), any(Object.class));
    }

    @Test
    void handleMessage_ignoresRelayWhenSessionIsNotBoundAndIgnoresNullDispatch() {
        controller.handleMessage(Map.of("type", "attack", "roomId", "ROOM2"), headers("session-unbound"));

        sessionRegistry.bindClient("session-1", "client-1");
        when(roomService.relay(eq("client-1"), any())).thenReturn(null);

        controller.handleMessage(Map.of("type", "attack", "roomId", "ROOM2"), headers("session-1"));

        verify(roomService).relay(eq("client-1"), any());
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    void onDisconnect_dispatchesMessagesForStoredSession() {
        sessionRegistry.bindClient("session-1", "client-1");
        sessionRegistry.setRoomCode("session-1", "ROOM1");
        BattleshipRoomService.Dispatch dispatch = BattleshipRoomService.Dispatch.ok();
        dispatch.addMessage("client-2", Map.of("type", "opponent_left", "roomId", "ROOM1"));
        when(roomService.disconnect("client-1", "ROOM1")).thenReturn(dispatch);

        controller.onDisconnect(disconnectEvent("session-1"));

        verify(roomService).disconnect("client-1", "ROOM1");
        verify(messagingTemplate).convertAndSend(eq("/topic/battleship/client/client-2"), any(Object.class));
        assertThat(sessionRegistry.getClientToken("session-1")).isNull();
    }

    @Test
    void onDisconnect_ignoresUnknownOrIncompleteSessions() {
        controller.onDisconnect(disconnectEvent("missing"));

        sessionRegistry.setRoomCode("session-2", "ROOM2");
        controller.onDisconnect(disconnectEvent("session-2"));

        verifyNoInteractions(roomService, messagingTemplate);
    }

    @Test
    void onDisconnect_ignoresNullDispatchForCompleteSession() {
        sessionRegistry.bindClient("session-3", "client-3");
        sessionRegistry.setRoomCode("session-3", "ROOM3");
        when(roomService.disconnect("client-3", "ROOM3")).thenReturn(null);

        controller.onDisconnect(disconnectEvent("session-3"));

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
}


