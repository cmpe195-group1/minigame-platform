package cmpe195.group1.minigameplatform.games.sudoku.websocket;

import cmpe195.group1.minigameplatform.games.sudoku.model.RoomState;
import cmpe195.group1.minigameplatform.games.sudoku.payload.MakeMovePayload;
import cmpe195.group1.minigameplatform.games.sudoku.service.RoomService;
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
public class SudokuStompController extends AbstractSnapshotRoomStompController<RoomState> {

    private final RoomService roomService;

    public SudokuStompController(
        RoomService roomService,
        SimpMessagingTemplate messagingTemplate,
        StompSessionRegistry sessionRegistry
    ) {
        super("sudoku", roomService, messagingTemplate, sessionRegistry);
        this.roomService = roomService;
    }

    @MessageMapping("/sudoku/create")
    public void createRoom(CreateRoomRequest payload, SimpMessageHeaderAccessor headers) {
        handleCreateRoom(payload, headers);
    }

    @MessageMapping("/sudoku/join")
    public void joinRoom(JoinRoomRequest payload, SimpMessageHeaderAccessor headers) {
        handleJoinRoom(payload, headers);
    }

    @MessageMapping("/sudoku/start")
    public void startGame(RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
        handleSnapshotAction(headers, clientToken -> roomService.startGame(
            clientToken,
            payload != null ? payload.resolveRoomCode() : null
        ));
    }

    @MessageMapping("/sudoku/makeMove")
    public void makeMove(MakeMovePayload payload, SimpMessageHeaderAccessor headers) {
        handleSnapshotAction(headers, clientToken -> roomService.makeMove(clientToken, payload));
    }

    @MessageMapping("/sudoku/newPuzzle")
    public void newPuzzle(RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
        handleSnapshotAction(headers, clientToken -> roomService.newPuzzle(
            clientToken,
            payload != null ? payload.resolveRoomCode() : null
        ));
    }

    @MessageMapping("/sudoku/restart")
    public void restart(RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
        handleSnapshotAction(headers, clientToken -> roomService.restart(
            clientToken,
            payload != null ? payload.resolveRoomCode() : null
        ));
    }

    @MessageMapping("/sudoku/leave")
    public void leaveRoom(RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
        handleLeaveRoom(payload, headers);
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        handleDisconnect(event);
    }
}
