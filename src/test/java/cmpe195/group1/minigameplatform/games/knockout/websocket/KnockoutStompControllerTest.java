package cmpe195.group1.minigameplatform.games.knockout.websocket;

import cmpe195.group1.minigameplatform.games.knockout.model.RoomState;
import cmpe195.group1.minigameplatform.games.knockout.payload.ResolveTurnPayload;
import cmpe195.group1.minigameplatform.games.knockout.payload.ShotPayload;
import cmpe195.group1.minigameplatform.games.knockout.service.KnockoutRoomService;
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

class KnockoutStompControllerTest {

    @Test
    void routesMessagesThroughRoomService() {
        KnockoutRoomService roomService = mock(KnockoutRoomService.class);
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        StompSessionRegistry sessionRegistry = new StompSessionRegistry();
        KnockoutStompController controller = new KnockoutStompController(roomService, messagingTemplate, sessionRegistry);

        RoomState room = new RoomState();
        room.setRoomCode("ROOMA");
        when(roomService.createRoom(eq("client-a"), any(CreateRoomRequest.class))).thenReturn(room);
        when(roomService.joinRoom(eq("client-b"), any(RoomScopedPayload.JoinRoomRequest.class))).thenReturn(RoomActionResult.ok(room));
        when(roomService.roomCodeOf(room)).thenReturn("ROOMA");
        when(roomService.startGame(eq("client-a"), eq("ROOMA"))).thenReturn(room);
        when(roomService.recordShot(eq("client-a"), any(ShotPayload.class))).thenReturn(room);
        when(roomService.resolveTurn(eq("client-a"), any(ResolveTurnPayload.class))).thenReturn(room);
        when(roomService.reset(eq("client-a"), eq("ROOMA"))).thenReturn(room);
        when(roomService.disconnect(anyString(), eq("ROOMA"))).thenReturn(room);

        controller.createRoom(createRequest("client-a"), headers("session-a"));
        controller.joinRoom(joinRequest("client-b", "ROOMA"), headers("session-b"));
        controller.startGame(roomPayload(new RoomScopedPayload.RoomCodeRequest(), "ROOMA"), headers("session-a"));
        controller.shot(shotPayload("ROOMA"), headers("session-a"));
        controller.resolveTurn(resolvePayload("ROOMA"), headers("session-a"));
        controller.reset(roomPayload(new RoomScopedPayload.RoomCodeRequest(), "ROOMA"), headers("session-a"));
        controller.leave(roomPayload(new RoomScopedPayload.RoomCodeRequest(), "ROOMA"), headers("session-a"));
        sessionRegistry.bindClient("session-disc", "client-disc");
        sessionRegistry.setRoomCode("session-disc", "ROOMA");
        controller.onDisconnect(disconnectEvent("session-disc"));

        verify(roomService).createRoom(eq("client-a"), any(CreateRoomRequest.class));
        verify(roomService).joinRoom(eq("client-b"), any(RoomScopedPayload.JoinRoomRequest.class));
        verify(roomService).startGame(eq("client-a"), eq("ROOMA"));
        verify(roomService).recordShot(eq("client-a"), any(ShotPayload.class));
        verify(roomService).resolveTurn(eq("client-a"), any(ResolveTurnPayload.class));
        verify(roomService).reset(eq("client-a"), eq("ROOMA"));
        verify(roomService, times(2)).disconnect(anyString(), eq("ROOMA"));
        verify(messagingTemplate, atLeastOnce()).convertAndSend(eq("/topic/knockout/client/client-a"), any(Object.class));
        verify(messagingTemplate, atLeastOnce()).convertAndSend(eq("/topic/knockout/room/ROOMA"), any(Object.class));
    }

    @Test
    void passesNullRoomCodeWhenStartOrResetPayloadIsMissing() {
        KnockoutRoomService roomService = mock(KnockoutRoomService.class);
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        StompSessionRegistry sessionRegistry = new StompSessionRegistry();
        KnockoutStompController controller = new KnockoutStompController(roomService, messagingTemplate, sessionRegistry);

        sessionRegistry.bindClient("session-a", "client-a");
        when(roomService.startGame("client-a", null)).thenReturn(null);
        when(roomService.reset("client-a", null)).thenReturn(null);

        controller.startGame(null, headers("session-a"));
        controller.reset(null, headers("session-a"));

        verify(roomService).startGame("client-a", null);
        verify(roomService).reset("client-a", null);
        verifyNoInteractions(messagingTemplate);
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

    private ShotPayload shotPayload(String roomCode) {
        ShotPayload payload = new ShotPayload();
        payload.setRoomCode(roomCode);
        payload.setTurnNumber(2);
        payload.setPuckId("A-1");
        payload.setImpulseX(3.5);
        payload.setImpulseY(-1.5);
        return payload;
    }

    private ResolveTurnPayload resolvePayload(String roomCode) {
        ResolveTurnPayload payload = new ResolveTurnPayload();
        payload.setRoomCode(roomCode);
        payload.setResultingState(new cmpe195.group1.minigameplatform.games.knockout.model.KnockoutGameState());
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

