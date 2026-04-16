package cmpe195.group1.minigameplatform.games.battleship.backend.websocket;

import cmpe195.group1.minigameplatform.games.battleship.backend.service.BattleshipRoomService;
import cmpe195.group1.minigameplatform.games.sudoku.backend.websocket.StompSessionRegistry;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@Controller
public class BattleshipStompController {
    private static final String SESSION_SCOPE = "battleship";

    private final BattleshipRoomService roomService;
    private final SimpMessagingTemplate messagingTemplate;
    private final StompSessionRegistry sessionRegistry;

    public BattleshipStompController(
        BattleshipRoomService roomService,
        SimpMessagingTemplate messagingTemplate,
        StompSessionRegistry sessionRegistry
    ) {
        this.roomService = roomService;
        this.messagingTemplate = messagingTemplate;
        this.sessionRegistry = sessionRegistry;
    }

    @MessageMapping("/battleship/send")
    public void handleMessage(Map<String, Object> payload, SimpMessageHeaderAccessor headers) {
        String sessionId = headers.getSessionId();
        String type = stringValue(payload, "type");
        if (sessionId == null || type == null || type.isBlank()) {
            return;
        }

        BattleshipRoomService.Dispatch dispatch;
        if ("create_room".equals(type) || "join".equals(type)) {
            String clientToken = stringValue(payload, "clientToken");
            if (clientToken == null || clientToken.isBlank()) {
                return;
            }

        sessionRegistry.bindClient(sessionId, clientToken);
            dispatch = "create_room".equals(type)
                ? roomService.createRoom(clientToken, payload)
                : roomService.joinRoom(clientToken, payload);

            if (dispatch.isOk()) {
                sessionRegistry.setRoomCode(sessionId, normalizeRoomId(stringValue(payload, "roomId")));
            }
            sendDispatch(clientToken, dispatch);
            return;
        }

        String clientToken = sessionRegistry.getClientToken(sessionId);
        if (clientToken == null) {
            return;
        }

        dispatch = roomService.relay(clientToken, payload);
        sendDispatch(clientToken, dispatch);
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        StompSessionRegistry.SessionInfo info = sessionRegistry.remove(event.getSessionId());
        if (info == null || info.getClientToken() == null) {
            return;
        }

        BattleshipRoomService.Dispatch dispatch = roomService.disconnect(info.getClientToken(), info.getRoomCode());
        sendDispatch(info.getClientToken(), dispatch);
    }

    private void sendDispatch(String fallbackClientToken, BattleshipRoomService.Dispatch dispatch) {
        if (dispatch == null) {
            return;
        }
        if (!dispatch.isOk() && fallbackClientToken != null) {
            sendToClient(fallbackClientToken, Map.of(
                "type", "error",
                "message", dispatch.getError()
            ));
            return;
        }

        for (Map.Entry<String, List<Map<String, Object>>> entry : dispatch.getOutboundMessages().entrySet()) {
            for (Map<String, Object> message : entry.getValue()) {
                sendToClient(entry.getKey(), message);
            }
        }
    }

    private void sendToClient(String clientToken, Map<String, Object> message) {
        Object payload = message;
        messagingTemplate.convertAndSend("/topic/battleship/client/" + clientToken, payload);
    }

    private String stringValue(Map<String, Object> payload, String key) {
        if (payload == null) {
            return null;
        }
        Object value = payload.get(key);
        return value != null ? value.toString() : null;
    }

    private String normalizeRoomId(String roomId) {
        if (roomId == null) {
            return "";
        }
        return roomId.trim().toUpperCase(Locale.ROOT);
    }
}
