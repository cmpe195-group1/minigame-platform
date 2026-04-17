package cmpe195.group1.minigameplatform.games.trivia.backend.websocket;

import cmpe195.group1.minigameplatform.games.trivia.backend.model.RoomState;
import cmpe195.group1.minigameplatform.games.trivia.backend.payload.PublishStatePayload;
import cmpe195.group1.minigameplatform.games.trivia.backend.payload.SubmitAnswerPayload;
import cmpe195.group1.minigameplatform.games.trivia.backend.payload.UpdateSettingsPayload;
import cmpe195.group1.minigameplatform.games.trivia.backend.service.RoomService;
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
public class TriviaStompController extends AbstractSnapshotRoomStompController<RoomState> {

    private final RoomService roomService;

    public TriviaStompController(
        RoomService roomService,
        SimpMessagingTemplate messagingTemplate,
        StompSessionRegistry sessionRegistry
    ) {
        super("trivia", roomService, messagingTemplate, sessionRegistry);
        this.roomService = roomService;
    }

    @MessageMapping("/trivia/create")
    public void createRoom(CreateRoomRequest payload, SimpMessageHeaderAccessor headers) {
        handleCreateRoom(payload, headers);
    }

    @MessageMapping("/trivia/join")
    public void joinRoom(JoinRoomRequest payload, SimpMessageHeaderAccessor headers) {
        handleJoinRoom(payload, headers);
    }

    @MessageMapping("/trivia/settings")
    public void updateSettings(UpdateSettingsPayload payload, SimpMessageHeaderAccessor headers) {
        String clientToken = getClientToken(headers);
        if (clientToken == null) {
            return;
        }

        RoomState room = roomService.updateSettings(clientToken, payload);
        if (room != null) {
            broadcastRoom(room.getRoomCode(), room);
        }
    }

    @MessageMapping("/trivia/state")
    public void publishState(PublishStatePayload payload, SimpMessageHeaderAccessor headers) {
        String clientToken = getClientToken(headers);
        if (clientToken == null) {
            return;
        }

        RoomState room = roomService.publishState(clientToken, payload);
        if (room != null) {
            broadcastRoom(room.getRoomCode(), room);
        }
    }

    @MessageMapping("/trivia/submitAnswer")
    public void submitAnswer(SubmitAnswerPayload payload, SimpMessageHeaderAccessor headers) {
        String clientToken = getClientToken(headers);
        if (clientToken == null) {
            return;
        }

        RoomState room = roomService.submitAnswer(clientToken, payload);
        if (room != null) {
            broadcastRoom(room.getRoomCode(), room);
        }
    }

    @MessageMapping("/trivia/leave")
    public void leaveRoom(RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
        handleLeaveRoom(payload, headers);
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        handleDisconnect(event);
    }
}

