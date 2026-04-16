package cmpe195.group1.minigameplatform.games.archery.backend.websocket;

import cmpe195.group1.minigameplatform.games.archery.backend.model.ArcheryRoomState;
import cmpe195.group1.minigameplatform.games.archery.backend.payload.ArcheryArrowShotPayload;
import cmpe195.group1.minigameplatform.games.archery.backend.payload.ArcheryCreateRoomPayload;
import cmpe195.group1.minigameplatform.games.archery.backend.payload.ArcheryJoinRoomPayload;
import cmpe195.group1.minigameplatform.games.archery.backend.payload.ArcheryRoomPayload;
import cmpe195.group1.minigameplatform.games.archery.backend.payload.ArcheryServerMessage;
import cmpe195.group1.minigameplatform.games.archery.backend.service.ArcheryRoomService;
import cmpe195.group1.minigameplatform.games.sudoku.backend.websocket.StompSessionRegistry;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Controller
public class ArcheryStompController {
    private static final String SESSION_SCOPE = "archery";

    private final ArcheryRoomService roomService;
    private final SimpMessagingTemplate messagingTemplate;
    private final StompSessionRegistry sessionRegistry;

    public ArcheryStompController(
        ArcheryRoomService roomService,
        SimpMessagingTemplate messagingTemplate,
        StompSessionRegistry sessionRegistry
    ) {
        this.roomService = roomService;
        this.messagingTemplate = messagingTemplate;
        this.sessionRegistry = sessionRegistry;
    }

    @MessageMapping("/archery/create")
    public void createRoom(ArcheryCreateRoomPayload payload, SimpMessageHeaderAccessor headers) {
        String sessionId = headers.getSessionId();
        String clientToken = payload != null ? payload.getClientToken() : null;
        if (sessionId == null || clientToken == null || clientToken.isBlank()) {
            return;
        }

        sessionRegistry.bindClient(sessionId, clientToken);
        ArcheryRoomState room = roomService.createRoom(clientToken, payload);
        sessionRegistry.setRoomCode(sessionId, room.getId());
        sendToClient(clientToken, ArcheryServerMessage.roomState(room));
    }

    @MessageMapping("/archery/join")
    public void joinRoom(ArcheryJoinRoomPayload payload, SimpMessageHeaderAccessor headers) {
        String sessionId = headers.getSessionId();
        String clientToken = payload != null ? payload.getClientToken() : null;
        if (sessionId == null || clientToken == null || clientToken.isBlank()) {
            return;
        }

        sessionRegistry.bindClient(sessionId, clientToken);
        ArcheryRoomService.ActionResult result = roomService.joinRoom(clientToken, payload);
        if (!result.isOk()) {
            sendToClient(clientToken, ArcheryServerMessage.error(result.getError()));
            return;
        }

        ArcheryRoomState room = result.getRoom();
        if (room != null) {
            sessionRegistry.setRoomCode(sessionId, room.getId());
            sendToClient(clientToken, ArcheryServerMessage.roomState(room));
            broadcastRoom(room);
        }
    }

    @MessageMapping("/archery/ready")
    public void setReady(ArcheryRoomPayload payload, SimpMessageHeaderAccessor headers) {
        String clientToken = sessionRegistry.getClientToken(headers.getSessionId());
        handleRoomAction(
            clientToken,
            roomService.setReady(clientToken, payload != null ? payload.getRoomId() : null)
        );
    }

    @MessageMapping("/archery/start")
    public void startGame(ArcheryRoomPayload payload, SimpMessageHeaderAccessor headers) {
        String clientToken = sessionRegistry.getClientToken(headers.getSessionId());
        handleRoomAction(
            clientToken,
            roomService.startGame(clientToken, payload != null ? payload.getRoomId() : null)
        );
    }

    @MessageMapping("/archery/arrowShot")
    public void recordArrowShot(ArcheryArrowShotPayload payload, SimpMessageHeaderAccessor headers) {
        String clientToken = sessionRegistry.getClientToken(headers.getSessionId());
        handleRoomAction(clientToken, roomService.recordArrowShot(clientToken, payload));
    }

    @MessageMapping("/archery/leave")
    public void leaveRoom(ArcheryRoomPayload payload, SimpMessageHeaderAccessor headers) {
        String sessionId = headers.getSessionId();
        String clientToken = sessionRegistry.getClientToken(sessionId);
        if (sessionId == null || clientToken == null) {
            return;
        }

        ArcheryRoomState room = roomService.disconnect(clientToken, payload != null ? payload.getRoomId() : null);
        sessionRegistry.clearRoomCode(sessionId);
        if (room != null) {
            broadcastRoom(room);
        }
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        StompSessionRegistry.SessionInfo info = sessionRegistry.remove(event.getSessionId());
        if (info == null || info.getClientToken() == null || info.getRoomCode() == null) {
            return;
        }

        ArcheryRoomState room = roomService.disconnect(info.getClientToken(), info.getRoomCode());
        if (room != null) {
            broadcastRoom(room);
        }
    }

    private void handleRoomAction(String clientToken, ArcheryRoomService.ActionResult result) {
        if (clientToken == null || result == null) {
            return;
        }
        if (!result.isOk()) {
            sendToClient(clientToken, ArcheryServerMessage.error(result.getError()));
            return;
        }

        ArcheryRoomState room = result.getRoom();
        if (room != null) {
            broadcastRoom(room);
        }
    }

    private void broadcastRoom(ArcheryRoomState room) {
        messagingTemplate.convertAndSend(
            "/topic/archery/room/" + room.getId(),
            ArcheryServerMessage.roomState(room)
        );
    }

    private void sendToClient(String clientToken, ArcheryServerMessage message) {
        messagingTemplate.convertAndSend("/topic/archery/client/" + clientToken, message);
    }
}
