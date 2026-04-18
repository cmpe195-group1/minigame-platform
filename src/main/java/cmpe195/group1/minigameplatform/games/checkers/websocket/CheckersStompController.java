package cmpe195.group1.minigameplatform.games.checkers.websocket;

import cmpe195.group1.minigameplatform.games.checkers.model.RoomState;
import cmpe195.group1.minigameplatform.games.checkers.payload.MovePayload;
import cmpe195.group1.minigameplatform.games.checkers.service.CheckersRoomService;
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
public class CheckersStompController extends AbstractSnapshotRoomStompController<RoomState> {

    private final CheckersRoomService roomService;

    public CheckersStompController(
        CheckersRoomService roomService,
        SimpMessagingTemplate messagingTemplate,
        StompSessionRegistry sessionRegistry
    ) {
        super("checkers", roomService, messagingTemplate, sessionRegistry);
        this.roomService = roomService;
    }

    @MessageMapping("/checkers/create")
    public void createRoom(CreateRoomRequest payload, SimpMessageHeaderAccessor headers) {
        handleCreateRoom(payload, headers);
    }

    @MessageMapping("/checkers/join")
    public void joinRoom(JoinRoomRequest payload, SimpMessageHeaderAccessor headers) {
        handleJoinRoom(payload, headers);
    }

    @MessageMapping("/checkers/start")
    public void startGame(RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
        handleSnapshotAction(headers, clientToken -> roomService.startGame(
            clientToken,
            payload != null ? payload.resolveRoomCode() : null
        ));
    }

    @MessageMapping("/checkers/move")
    public void move(MovePayload payload, SimpMessageHeaderAccessor headers) {
        handleSnapshotAction(headers, clientToken -> roomService.makeMove(clientToken, payload));
    }

    @MessageMapping("/checkers/reset")
    public void reset(RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
        handleSnapshotAction(headers, clientToken -> roomService.reset(
            clientToken,
            payload != null ? payload.resolveRoomCode() : null
        ));
    }

    @MessageMapping("/checkers/leave")
    public void leave(RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
        handleLeaveRoom(payload, headers);
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        handleDisconnect(event);
    }
}
