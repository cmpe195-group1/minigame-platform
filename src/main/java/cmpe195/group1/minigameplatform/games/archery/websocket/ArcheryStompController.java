package cmpe195.group1.minigameplatform.games.archery.websocket;

import cmpe195.group1.minigameplatform.games.archery.model.ArcheryRoomState;
import cmpe195.group1.minigameplatform.games.archery.payload.ArcheryArrowShotPayload;
import cmpe195.group1.minigameplatform.games.archery.service.ArcheryRoomService;
import cmpe195.group1.minigameplatform.multiplayer.payload.CreateRoomRequest;
import cmpe195.group1.minigameplatform.multiplayer.payload.JoinRoomRequest;
import cmpe195.group1.minigameplatform.multiplayer.payload.RoomCodeRequest;
import cmpe195.group1.minigameplatform.multiplayer.websocket.AbstractSnapshotRoomStompController;
import cmpe195.group1.minigameplatform.multiplayer.websocket.StompSessionRegistry;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Controller
public class ArcheryStompController extends AbstractSnapshotRoomStompController<ArcheryRoomState> {
    private final ArcheryRoomService roomService;

    public ArcheryStompController(
        ArcheryRoomService roomService,
        SimpMessagingTemplate messagingTemplate,
        StompSessionRegistry sessionRegistry
    ) {
        super("archery", roomService, messagingTemplate, sessionRegistry);
        this.roomService = roomService;
    }

    @MessageMapping("/archery/create")
    public void createRoom(CreateRoomRequest payload, SimpMessageHeaderAccessor headers) {
        handleCreateRoom(payload, headers);
    }

    @MessageMapping("/archery/join")
    public void joinRoom(JoinRoomRequest payload, SimpMessageHeaderAccessor headers) {
        handleJoinRoom(payload, headers);
    }

    @MessageMapping("/archery/ready")
    public void setReady(RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
        handleRoomActionResult(headers, clientToken -> roomService.setReady(
            clientToken,
            payload != null ? payload.resolveRoomCode() : null
        ));
    }

    @MessageMapping("/archery/start")
    public void startGame(RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
        handleRoomActionResult(headers, clientToken -> roomService.startGame(
            clientToken,
            payload != null ? payload.resolveRoomCode() : null
        ));
    }

    @MessageMapping("/archery/arrowShot")
    public void recordArrowShot(ArcheryArrowShotPayload payload, SimpMessageHeaderAccessor headers) {
        handleRoomActionResult(headers, clientToken -> roomService.recordArrowShot(clientToken, payload));
    }

    @MessageMapping("/archery/leave")
    public void leaveRoom(RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
        handleLeaveRoom(payload, headers);
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        handleDisconnect(event);
    }
}
