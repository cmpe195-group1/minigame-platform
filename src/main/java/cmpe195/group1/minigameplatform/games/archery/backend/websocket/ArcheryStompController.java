package cmpe195.group1.minigameplatform.games.archery.backend.websocket;

import cmpe195.group1.minigameplatform.games.archery.backend.model.ArcheryRoomState;
import cmpe195.group1.minigameplatform.games.archery.backend.payload.ArcheryArrowShotPayload;
import cmpe195.group1.minigameplatform.games.archery.backend.service.ArcheryRoomService;
import cmpe195.group1.minigameplatform.multiplayer.payload.CreateRoomRequest;
import cmpe195.group1.minigameplatform.multiplayer.payload.JoinRoomRequest;
import cmpe195.group1.minigameplatform.multiplayer.payload.RoomCodeRequest;
import cmpe195.group1.minigameplatform.multiplayer.service.RoomActionResult;
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
        String clientToken = getClientToken(headers);
        handleRoomAction(
            clientToken,
            roomService.setReady(clientToken, payload != null ? payload.resolveRoomCode() : null)
        );
    }

    @MessageMapping("/archery/start")
    public void startGame(RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
        String clientToken = getClientToken(headers);
        handleRoomAction(
            clientToken,
            roomService.startGame(clientToken, payload != null ? payload.resolveRoomCode() : null)
        );
    }

    @MessageMapping("/archery/arrowShot")
    public void recordArrowShot(ArcheryArrowShotPayload payload, SimpMessageHeaderAccessor headers) {
        String clientToken = getClientToken(headers);
        handleRoomAction(clientToken, roomService.recordArrowShot(clientToken, payload));
    }

    @MessageMapping("/archery/leave")
    public void leaveRoom(RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
        handleLeaveRoom(payload, headers);
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        handleDisconnect(event);
    }

    private void handleRoomAction(String clientToken, RoomActionResult<ArcheryRoomState> result) {
        if (clientToken == null || result == null) {
            return;
        }
        if (!result.isOk()) {
            sendError(clientToken, result.getError());
            return;
        }

        ArcheryRoomState room = result.getRoom();
        if (room != null) {
            broadcastRoom(room.getId(), room);
        }
    }
}
