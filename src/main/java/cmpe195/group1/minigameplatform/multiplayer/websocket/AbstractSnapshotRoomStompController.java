package cmpe195.group1.minigameplatform.multiplayer.websocket;

import cmpe195.group1.minigameplatform.multiplayer.payload.CreateRoomRequest;
import cmpe195.group1.minigameplatform.multiplayer.payload.JoinRoomRequest;
import cmpe195.group1.minigameplatform.multiplayer.payload.RoomCodeRequest;
import cmpe195.group1.minigameplatform.multiplayer.service.RoomActionResult;
import cmpe195.group1.minigameplatform.multiplayer.service.SnapshotRoomService;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.function.Function;

public abstract class AbstractSnapshotRoomStompController<R> extends AbstractRoomStompController<R> {

    private final SnapshotRoomService<R> roomService;

    protected AbstractSnapshotRoomStompController(
            String gameKey,
            SnapshotRoomService<R> roomService,
            SimpMessagingTemplate messagingTemplate,
            StompSessionRegistry sessionRegistry
    ) {
        super(gameKey, messagingTemplate, sessionRegistry);
        this.roomService = roomService;
    }

    protected void handleCreateRoom(CreateRoomRequest payload, SimpMessageHeaderAccessor headers) {
        String sessionId = getSessionId(headers);
        String clientToken = payload != null ? payload.getClientToken() : null;
        if (sessionId == null || clientToken == null || clientToken.isBlank()) {
            return;
        }

        bindClientSession(sessionId, clientToken);
        R room = roomService.createRoom(clientToken, payload);
        if (room == null) {
            return;
        }

        String roomCode = roomService.roomCodeOf(room);
        rememberRoomCode(sessionId, roomCode);
        sendRoomState(clientToken, room);
    }

    protected void handleJoinRoom(JoinRoomRequest payload, SimpMessageHeaderAccessor headers) {
        String sessionId = getSessionId(headers);
        String clientToken = payload != null ? payload.getClientToken() : null;
        if (sessionId == null || clientToken == null || clientToken.isBlank()) {
            return;
        }

        bindClientSession(sessionId, clientToken);
        RoomActionResult<R> result = roomService.joinRoom(clientToken, payload);
        if (result == null) {
            return;
        }
        if (!result.isOk()) {
            sendJoinError(clientToken, result.getError());
            return;
        }

        R room = result.getRoom();
        if (room == null) {
            return;
        }

        String roomCode = roomService.roomCodeOf(room);
        rememberRoomCode(sessionId, roomCode);
        sendRoomState(clientToken, room);
        broadcastRoom(roomCode, room);
    }

    protected void handleLeaveRoom(RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
        String sessionId = getSessionId(headers);
        String clientToken = getClientToken(headers);
        if (sessionId == null || clientToken == null) {
            return;
        }

        String roomCode = payload != null ? payload.resolveRoomCode() : null;
        R room = roomService.disconnect(clientToken, roomCode);
        clearRoomCode(sessionId);
        if (room != null) {
            broadcastRoom(roomService.roomCodeOf(room), room);
        }
    }

    protected void handleSnapshotAction(SimpMessageHeaderAccessor headers, Function<String, R> action) {
        String clientToken = getClientToken(headers);
        if (clientToken == null) {
            return;
        }

        R room = action.apply(clientToken);
        if (room != null) {
            broadcastRoom(roomService.roomCodeOf(room), room);
        }
    }

    protected void handleRoomActionResult(SimpMessageHeaderAccessor headers, Function<String, RoomActionResult<R>> action) {
        String clientToken = getClientToken(headers);
        if (clientToken == null) {
            return;
        }

        handleRoomActionResult(clientToken, action.apply(clientToken));
    }

    protected void handleRoomActionResult(String clientToken, RoomActionResult<R> result) {
        if (clientToken == null || result == null) {
            return;
        }
        if (!result.isOk()) {
            sendError(clientToken, result.getError());
            return;
        }

        R room = result.getRoom();
        if (room != null) {
            broadcastRoom(roomService.roomCodeOf(room), room);
        }
    }

    protected void handleDisconnect(SessionDisconnectEvent event) {
        StompSessionRegistry.SessionInfo info = removeSession(event);
        if (info == null || info.getClientToken() == null || info.getRoomCode() == null) {
            return;
        }

        R room = roomService.disconnect(info.getClientToken(), info.getRoomCode());
        if (room != null) {
            broadcastRoom(roomService.roomCodeOf(room), room);
        }
    }
}
