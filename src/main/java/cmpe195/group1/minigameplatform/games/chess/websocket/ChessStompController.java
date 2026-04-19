package cmpe195.group1.minigameplatform.games.chess.websocket;
import cmpe195.group1.minigameplatform.games.chess.model.RoomState;
import cmpe195.group1.minigameplatform.games.chess.payload.MovePayload;
import cmpe195.group1.minigameplatform.games.chess.service.ChessRoomService;
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
public class ChessStompController extends AbstractSnapshotRoomStompController<RoomState> {

    private final ChessRoomService roomService;

    public ChessStompController(
        ChessRoomService roomService,
        SimpMessagingTemplate messagingTemplate,
        StompSessionRegistry sessionRegistry
    ) {
        super("chess", roomService, messagingTemplate, sessionRegistry);
        this.roomService = roomService;
    }

    @MessageMapping("/chess/create")
    public void createRoom(CreateRoomRequest payload, SimpMessageHeaderAccessor headers) {
        handleCreateRoom(payload, headers);
    }

    @MessageMapping("/chess/join")
    public void joinRoom(RoomScopedPayload.JoinRoomRequest payload, SimpMessageHeaderAccessor headers) {
        handleJoinRoom(payload, headers);
    }

    @MessageMapping("/chess/start")
    public void startGame(RoomScopedPayload.RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
        handleSnapshotAction(headers, clientToken -> roomService.startGame(
            clientToken,
            payload != null ? payload.resolveRoomCode() : null
        ));
    }

    @MessageMapping("/chess/move")
    public void move(MovePayload payload, SimpMessageHeaderAccessor headers) {
        handleSnapshotAction(headers, clientToken -> roomService.makeMove(clientToken, payload));
    }

    @MessageMapping("/chess/reset")
    public void reset(RoomScopedPayload.RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
        handleSnapshotAction(headers, clientToken -> roomService.reset(
            clientToken,
            payload != null ? payload.resolveRoomCode() : null
        ));
    }

    @MessageMapping("/chess/leave")
    public void leave(RoomScopedPayload.RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
        handleLeaveRoom(payload, headers);
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        handleDisconnect(event);
    }
}
