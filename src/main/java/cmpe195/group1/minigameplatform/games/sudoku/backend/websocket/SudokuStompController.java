package cmpe195.group1.minigameplatform.games.sudoku.backend.websocket;

import cmpe195.group1.minigameplatform.games.sudoku.backend.model.RoomState;
import cmpe195.group1.minigameplatform.games.sudoku.backend.payload.MakeMovePayload;
import cmpe195.group1.minigameplatform.games.sudoku.backend.service.RoomService;
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
        String clientToken = getClientToken(headers);
        if (clientToken == null) {
            return;
        }

        RoomState room = roomService.startGame(clientToken, payload != null ? payload.resolveRoomCode() : null);
        if (room != null) {
            broadcastRoom(room.getRoomCode(), room);
        }
    }

    @MessageMapping("/sudoku/makeMove")
    public void makeMove(MakeMovePayload payload, SimpMessageHeaderAccessor headers) {
        String clientToken = getClientToken(headers);
        if (clientToken == null) {
            return;
        }

        RoomState room = roomService.makeMove(clientToken, payload);
        if (room != null) {
            broadcastRoom(room.getRoomCode(), room);
        }
    }

    @MessageMapping("/sudoku/newPuzzle")
    public void newPuzzle(RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
        String clientToken = getClientToken(headers);
        if (clientToken == null) {
            return;
        }

        RoomState room = roomService.newPuzzle(clientToken, payload != null ? payload.resolveRoomCode() : null);
        if (room != null) {
            broadcastRoom(room.getRoomCode(), room);
        }
    }

    @MessageMapping("/sudoku/restart")
    public void restart(RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
        String clientToken = getClientToken(headers);
        if (clientToken == null) {
            return;
        }

        RoomState room = roomService.restart(clientToken, payload != null ? payload.resolveRoomCode() : null);
        if (room != null) {
            broadcastRoom(room.getRoomCode(), room);
        }
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
