package cmpe195.group1.minigameplatform.games.trivia.websocket;

import cmpe195.group1.minigameplatform.games.trivia.model.RoomState;
import cmpe195.group1.minigameplatform.games.trivia.payload.PublishStatePayload;
import cmpe195.group1.minigameplatform.games.trivia.payload.SubmitAnswerPayload;
import cmpe195.group1.minigameplatform.games.trivia.payload.UpdateSettingsPayload;
import cmpe195.group1.minigameplatform.games.trivia.service.RoomService;
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
    public void joinRoom(RoomScopedPayload.JoinRoomRequest payload, SimpMessageHeaderAccessor headers) {
        handleJoinRoom(payload, headers);
    }

    @MessageMapping("/trivia/settings")
    public void updateSettings(UpdateSettingsPayload payload, SimpMessageHeaderAccessor headers) {
        handleSnapshotAction(headers, clientToken -> roomService.updateSettings(clientToken, payload));
    }

    @MessageMapping("/trivia/state")
    public void publishState(PublishStatePayload payload, SimpMessageHeaderAccessor headers) {
        handleSnapshotAction(headers, clientToken -> roomService.publishState(clientToken, payload));
    }

    @MessageMapping("/trivia/submitAnswer")
    public void submitAnswer(SubmitAnswerPayload payload, SimpMessageHeaderAccessor headers) {
        handleSnapshotAction(headers, clientToken -> roomService.submitAnswer(clientToken, payload));
    }

    @MessageMapping("/trivia/leave")
    public void leaveRoom(RoomScopedPayload.RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
        handleLeaveRoom(payload, headers);
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        handleDisconnect(event);
    }
}

