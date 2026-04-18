package cmpe195.group1.minigameplatform.games.archery.websocket;

import cmpe195.group1.minigameplatform.games.archery.model.ArcheryRoomState;
import cmpe195.group1.minigameplatform.games.archery.payload.ArcheryArrowShotPayload;
import cmpe195.group1.minigameplatform.games.archery.service.ArcheryRoomService;
import cmpe195.group1.minigameplatform.multiplayer.payload.CreateRoomRequest;
import cmpe195.group1.minigameplatform.multiplayer.payload.RoomScopedPayload;
import cmpe195.group1.minigameplatform.multiplayer.service.RoomActionResult;
import cmpe195.group1.minigameplatform.multiplayer.websocket.StompSessionRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class ArcheryStompControllerTest {

    @Test
    void routesMessagesThroughRoomService() {
        ArcheryRoomService roomService = mock(ArcheryRoomService.class);
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        StompSessionRegistry sessionRegistry = new StompSessionRegistry();
        ArcheryStompController controller = new ArcheryStompController(roomService, messagingTemplate, sessionRegistry);

        ArcheryRoomState room = new ArcheryRoomState();
        room.setId("ROOMA");
        when(roomService.createRoom(eq("client-a"), any(CreateRoomRequest.class))).thenReturn(room);
        when(roomService.joinRoom(eq("client-b"), any(RoomScopedPayload.JoinRoomRequest.class))).thenReturn(RoomActionResult.ok(room));
        when(roomService.roomCodeOf(room)).thenReturn("ROOMA");
        when(roomService.setReady(eq("client-a"), eq("ROOMA"))).thenReturn(RoomActionResult.ok(room));
        when(roomService.startGame(eq("client-a"), eq("ROOMA"))).thenReturn(RoomActionResult.error("Only the host can start the game."));
        when(roomService.recordArrowShot(eq("client-a"), any(ArcheryArrowShotPayload.class))).thenReturn(RoomActionResult.ok(room));
        when(roomService.disconnect(anyString(), eq("ROOMA"))).thenReturn(room);

        controller.createRoom(createRequest("client-a"), headers("session-a"));
        controller.joinRoom(joinRequest("client-b", "ROOMA"), headers("session-b"));
        controller.setReady(roomPayload(new RoomScopedPayload.RoomCodeRequest(), "ROOMA"), headers("session-a"));
        controller.startGame(roomPayload(new RoomScopedPayload.RoomCodeRequest(), "ROOMA"), headers("session-a"));
        controller.recordArrowShot(shotPayload("ROOMA"), headers("session-a"));
        controller.leaveRoom(roomPayload(new RoomScopedPayload.RoomCodeRequest(), "ROOMA"), headers("session-a"));
        sessionRegistry.bindClient("session-disc", "client-disc");
        sessionRegistry.setRoomCode("session-disc", "ROOMA");
        controller.onDisconnect(disconnectEvent("session-disc"));

        verify(roomService).createRoom(eq("client-a"), any(CreateRoomRequest.class));
        verify(roomService).joinRoom(eq("client-b"), any(RoomScopedPayload.JoinRoomRequest.class));
        verify(roomService).setReady(eq("client-a"), eq("ROOMA"));
        verify(roomService).startGame(eq("client-a"), eq("ROOMA"));
        verify(roomService).recordArrowShot(eq("client-a"), any(ArcheryArrowShotPayload.class));
        verify(roomService, times(2)).disconnect(anyString(), eq("ROOMA"));
        verify(messagingTemplate, atLeastOnce()).convertAndSend(eq("/topic/archery/client/client-a"), any(Object.class));
        verify(messagingTemplate, atLeastOnce()).convertAndSend(eq("/topic/archery/room/ROOMA"), any(Object.class));
    }

    @Test
    void passesNullRoomCodeWhenReadyOrStartPayloadIsMissing() {
        ArcheryRoomService roomService = mock(ArcheryRoomService.class);
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        StompSessionRegistry sessionRegistry = new StompSessionRegistry();
        ArcheryStompController controller = new ArcheryStompController(roomService, messagingTemplate, sessionRegistry);

        sessionRegistry.bindClient("session-a", "client-a");
        when(roomService.setReady("client-a", null)).thenReturn(RoomActionResult.error("missing"));
        when(roomService.startGame("client-a", null)).thenReturn(RoomActionResult.error("missing"));

        controller.setReady(null, headers("session-a"));
        controller.startGame(null, headers("session-a"));

        verify(roomService).setReady("client-a", null);
        verify(roomService).startGame("client-a", null);
        verify(messagingTemplate, times(2)).convertAndSend(eq("/topic/archery/client/client-a"), any(Object.class));
    }

    private CreateRoomRequest createRequest(String clientToken) {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setClientToken(clientToken);
        return request;
    }

    private RoomScopedPayload.JoinRoomRequest joinRequest(String clientToken, String roomCode) {
        RoomScopedPayload.JoinRoomRequest request = new RoomScopedPayload.JoinRoomRequest();
        request.setClientToken(clientToken);
        request.setRoomCode(roomCode);
        return request;
    }

    private <T extends RoomScopedPayload> T roomPayload(T payload, String roomCode) {
        payload.setRoomCode(roomCode);
        return payload;
    }

    private ArcheryArrowShotPayload shotPayload(String roomId) {
        ArcheryArrowShotPayload payload = new ArcheryArrowShotPayload();
        payload.setRoomId(roomId);
        payload.setScore(9);
        return payload;
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



