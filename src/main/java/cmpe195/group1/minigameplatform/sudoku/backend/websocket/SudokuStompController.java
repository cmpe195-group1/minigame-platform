package cmpe195.group1.minigameplatform.sudoku.backend.websocket;

import cmpe195.group1.minigameplatform.sudoku.backend.model.RoomState;
import cmpe195.group1.minigameplatform.sudoku.backend.payload.CreateRoomPayload;
import cmpe195.group1.minigameplatform.sudoku.backend.payload.JoinRoomPayload;
import cmpe195.group1.minigameplatform.sudoku.backend.payload.MakeMovePayload;
import cmpe195.group1.minigameplatform.sudoku.backend.payload.RoomCodePayload;
import cmpe195.group1.minigameplatform.sudoku.backend.payload.SudokuServerMessage;
import cmpe195.group1.minigameplatform.sudoku.backend.service.RoomService;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Controller
public class SudokuStompController {

    private final RoomService roomService;
    private final SimpMessagingTemplate messagingTemplate;
    private final StompSessionRegistry sessionRegistry;

    public SudokuStompController(
        RoomService roomService,
        SimpMessagingTemplate messagingTemplate,
        StompSessionRegistry sessionRegistry
    ) {
        this.roomService = roomService;
        this.messagingTemplate = messagingTemplate;
        this.sessionRegistry = sessionRegistry;
    }

    @MessageMapping("/sudoku/create")
    public void createRoom(CreateRoomPayload payload, SimpMessageHeaderAccessor headers) {
        String sessionId = headers.getSessionId();
        String clientToken = payload != null ? payload.getClientToken() : null;
        if (sessionId == null || clientToken == null || clientToken.isBlank()) {
            return;
        }

        sessionRegistry.bindClient(sessionId, clientToken);
        RoomState room = roomService.createRoom(clientToken, payload);
        sessionRegistry.setRoomCode(sessionId, room.getRoomCode());
        sendToClient(clientToken, SudokuServerMessage.roomState(room));
    }

    @MessageMapping("/sudoku/join")
    public void joinRoom(JoinRoomPayload payload, SimpMessageHeaderAccessor headers) {
        String sessionId = headers.getSessionId();
        String clientToken = payload != null ? payload.getClientToken() : null;
        if (sessionId == null || clientToken == null || clientToken.isBlank()) {
            return;
        }

        sessionRegistry.bindClient(sessionId, clientToken);
        RoomService.JoinResult result = roomService.joinRoom(clientToken, payload);
        if (!result.isOk()) {
            sendToClient(clientToken, SudokuServerMessage.joinError(result.getError()));
            return;
        }

        sessionRegistry.setRoomCode(sessionId, result.getRoomCode());
        RoomState room = roomService.getRoom(result.getRoomCode());
        if (room != null) {
            sendToClient(clientToken, SudokuServerMessage.roomState(room));
            broadcastRoom(room);
        }
    }

    @MessageMapping("/sudoku/start")
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

    @MessageMapping("/sudoku/makeMove")
    public void makeMove(MakeMovePayload payload, SimpMessageHeaderAccessor headers) {
        String clientToken = sessionRegistry.getClientToken(headers.getSessionId());
        if (clientToken == null) {
            return;
        }

        RoomState room = roomService.makeMove(clientToken, payload);
        if (room != null) {
            broadcastRoom(room);
        }
    }

    @MessageMapping("/sudoku/newPuzzle")
    public void newPuzzle(RoomCodePayload payload, SimpMessageHeaderAccessor headers) {
        String clientToken = sessionRegistry.getClientToken(headers.getSessionId());
        if (clientToken == null) {
            return;
        }

        RoomState room = roomService.newPuzzle(clientToken, payload != null ? payload.getRoomCode() : null);
        if (room != null) {
            broadcastRoom(room);
        }
    }

    @MessageMapping("/sudoku/restart")
    public void restart(RoomCodePayload payload, SimpMessageHeaderAccessor headers) {
        String clientToken = sessionRegistry.getClientToken(headers.getSessionId());
        if (clientToken == null) {
            return;
        }

        RoomState room = roomService.restart(clientToken, payload != null ? payload.getRoomCode() : null);
        if (room != null) {
            broadcastRoom(room);
        }
    }

    @MessageMapping("/sudoku/leave")
    public void leaveRoom(RoomCodePayload payload, SimpMessageHeaderAccessor headers) {
        String sessionId = headers.getSessionId();
        String clientToken = sessionRegistry.getClientToken(sessionId);
        if (sessionId == null || clientToken == null) {
            return;
        }

        String roomCode = payload != null ? payload.getRoomCode() : null;
        RoomState room = roomService.disconnect(clientToken, roomCode);
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
            "/topic/sudoku/room/" + room.getRoomCode(),
            SudokuServerMessage.roomState(room)
        );
    }

    private void sendToClient(String clientToken, SudokuServerMessage message) {
        messagingTemplate.convertAndSend("/topic/sudoku/client/" + clientToken, message);
    }
}
