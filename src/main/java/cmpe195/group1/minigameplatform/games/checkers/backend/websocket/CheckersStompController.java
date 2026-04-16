package cmpe195.group1.minigameplatform.games.checkers.backend.websocket;

import cmpe195.group1.minigameplatform.games.checkers.backend.model.RoomState;
import cmpe195.group1.minigameplatform.games.checkers.backend.payload.CheckersServerMessage;
import cmpe195.group1.minigameplatform.games.checkers.backend.payload.CreateRoomPayload;
import cmpe195.group1.minigameplatform.games.checkers.backend.payload.JoinRoomPayload;
import cmpe195.group1.minigameplatform.games.checkers.backend.payload.MovePayload;
import cmpe195.group1.minigameplatform.games.checkers.backend.payload.RoomCodePayload;
import cmpe195.group1.minigameplatform.games.checkers.backend.service.CheckersRoomService;
import cmpe195.group1.minigameplatform.games.sudoku.backend.websocket.StompSessionRegistry;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Controller
public class CheckersStompController {

    private final CheckersRoomService roomService;
    private final SimpMessagingTemplate messagingTemplate;
    private final StompSessionRegistry sessionRegistry;

    public CheckersStompController(
        CheckersRoomService roomService,
        SimpMessagingTemplate messagingTemplate,
        StompSessionRegistry sessionRegistry
    ) {
        this.roomService = roomService;
        this.messagingTemplate = messagingTemplate;
        this.sessionRegistry = sessionRegistry;
    }

    @MessageMapping("/checkers/create")
    public void createRoom(CreateRoomPayload payload, SimpMessageHeaderAccessor headers) {
        String sessionId = headers.getSessionId();
        String clientToken = payload != null ? payload.getClientToken() : null;
        if (sessionId == null || clientToken == null || clientToken.isBlank()) {
            return;
        }

        sessionRegistry.bindClient(sessionId, clientToken);
        RoomState room = roomService.createRoom(clientToken, payload);
        sessionRegistry.setRoomCode(sessionId, room.getRoomCode());
        sendToClient(clientToken, CheckersServerMessage.roomState(room));
    }

    @MessageMapping("/checkers/join")
    public void joinRoom(JoinRoomPayload payload, SimpMessageHeaderAccessor headers) {
        String sessionId = headers.getSessionId();
        String clientToken = payload != null ? payload.getClientToken() : null;
        if (sessionId == null || clientToken == null || clientToken.isBlank()) {
            return;
        }

        sessionRegistry.bindClient(sessionId, clientToken);
        CheckersRoomService.JoinResult result = roomService.joinRoom(clientToken, payload);
        if (!result.isOk()) {
            sendToClient(clientToken, CheckersServerMessage.joinError(result.getError()));
            return;
        }

        sessionRegistry.setRoomCode(sessionId, result.getRoomCode());
        RoomState room = roomService.getRoom(result.getRoomCode());
        if (room != null) {
            sendToClient(clientToken, CheckersServerMessage.roomState(room));
            broadcastRoom(room);
        }
    }

    @MessageMapping("/checkers/start")
    public void startGame(RoomCodePayload payload, SimpMessageHeaderAccessor headers) {
        String clientToken = sessionRegistry.getClientToken(headers.getSessionId());
        if (clientToken == null) {
            return;
        }

        RoomState room = roomService.startGame(clientToken, payload != null ? payload.getRoomCode() : null);
        if (room != null) {
            broadcastRoom(room);
        }
    }

    @MessageMapping("/checkers/move")
    public void move(MovePayload payload, SimpMessageHeaderAccessor headers) {
        String clientToken = sessionRegistry.getClientToken(headers.getSessionId());
        if (clientToken == null) {
            return;
        }

        RoomState room = roomService.makeMove(clientToken, payload);
        if (room != null) {
            broadcastRoom(room);
        }
    }

    @MessageMapping("/checkers/reset")
    public void reset(RoomCodePayload payload, SimpMessageHeaderAccessor headers) {
        String clientToken = sessionRegistry.getClientToken(headers.getSessionId());
        if (clientToken == null) {
            return;
        }

        RoomState room = roomService.reset(clientToken, payload != null ? payload.getRoomCode() : null);
        if (room != null) {
            broadcastRoom(room);
        }
    }

    @MessageMapping("/checkers/leave")
    public void leave(RoomCodePayload payload, SimpMessageHeaderAccessor headers) {
        String sessionId = headers.getSessionId();
        String clientToken = sessionRegistry.getClientToken(sessionId);
        if (sessionId == null || clientToken == null) {
            return;
        }

        RoomState room = roomService.disconnect(clientToken, payload != null ? payload.getRoomCode() : null);
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

        RoomState room = roomService.disconnect(info.getClientToken(), info.getRoomCode());
        if (room != null) {
            broadcastRoom(room);
        }
    }

    private void broadcastRoom(RoomState room) {
        messagingTemplate.convertAndSend(
            "/topic/checkers/room/" + room.getRoomCode(),
            CheckersServerMessage.roomState(room)
        );
    }

    private void sendToClient(String clientToken, CheckersServerMessage message) {
        messagingTemplate.convertAndSend("/topic/checkers/client/" + clientToken, message);
    }
}
