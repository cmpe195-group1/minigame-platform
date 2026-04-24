package cmpe195.group1.minigameplatform.games.knockout.websocket;

import cmpe195.group1.minigameplatform.games.knockout.model.RoomState;
import cmpe195.group1.minigameplatform.games.knockout.payload.ResolveTurnPayload;
import cmpe195.group1.minigameplatform.games.knockout.payload.ShotPayload;
import cmpe195.group1.minigameplatform.games.knockout.service.KnockoutRoomService;
import cmpe195.group1.minigameplatform.multiplayer.payload.CreateRoomRequest;
import cmpe195.group1.minigameplatform.multiplayer.payload.RoomScopedPayload;
import cmpe195.group1.minigameplatform.multiplayer.websocket.AbstractSnapshotRoomStompController;
import cmpe195.group1.minigameplatform.multiplayer.websocket.StompSessionRegistry;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Controller
public class KnockoutStompController extends AbstractSnapshotRoomStompController<RoomState> {

    private final KnockoutRoomService roomService;

    public KnockoutStompController(
        KnockoutRoomService roomService,
        SimpMessagingTemplate messagingTemplate,
        StompSessionRegistry sessionRegistry
    ) {
        super("knockout", roomService, messagingTemplate, sessionRegistry);
        this.roomService = roomService;
    }

    @MessageMapping("/knockout/create")
    public void createRoom(CreateRoomRequest payload, SimpMessageHeaderAccessor headers) {
        handleCreateRoom(payload, headers);
    }

    @MessageMapping("/knockout/join")
    public void joinRoom(RoomScopedPayload.JoinRoomRequest payload, SimpMessageHeaderAccessor headers) {
        handleJoinRoom(payload, headers);
    }

    @MessageMapping("/knockout/start")
    public void startGame(RoomScopedPayload.RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
        handleSnapshotAction(headers, clientToken -> roomService.startGame(
            clientToken,
            payload != null ? payload.resolveRoomCode() : null
        ));
    }

    @MessageMapping("/knockout/shot")
    public void shot(ShotPayload payload, SimpMessageHeaderAccessor headers) {
        handleSnapshotAction(headers, clientToken -> roomService.recordShot(clientToken, payload));
    }

    @MessageMapping("/knockout/resolveTurn")
    public void resolveTurn(ResolveTurnPayload payload, SimpMessageHeaderAccessor headers) {
        handleSnapshotAction(headers, clientToken -> roomService.resolveTurn(clientToken, payload));
    }

    @MessageMapping("/knockout/reset")
    public void reset(RoomScopedPayload.RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
        handleSnapshotAction(headers, clientToken -> roomService.reset(
            clientToken,
            payload != null ? payload.resolveRoomCode() : null
        ));
    }

    @MessageMapping("/knockout/leave")
    public void leave(RoomScopedPayload.RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
        handleLeaveRoom(payload, headers);
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        handleDisconnect(event);
    }
}