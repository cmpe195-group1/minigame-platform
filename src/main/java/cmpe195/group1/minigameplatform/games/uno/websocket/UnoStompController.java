package cmpe195.group1.minigameplatform.games.uno.websocket;

import cmpe195.group1.minigameplatform.games.uno.model.RoomState;
import cmpe195.group1.minigameplatform.games.uno.payload.PublishStatePayload;
import cmpe195.group1.minigameplatform.games.uno.payload.SubmitActionPayload;
import cmpe195.group1.minigameplatform.games.uno.payload.UpdateSettingsPayload;
import cmpe195.group1.minigameplatform.games.uno.service.RoomService;
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
public class UnoStompController extends AbstractSnapshotRoomStompController<RoomState> {

    private final RoomService roomService;

    public UnoStompController(
        RoomService roomService,
        SimpMessagingTemplate messagingTemplate,
        StompSessionRegistry sessionRegistry
    ) {
        super("uno", roomService, messagingTemplate, sessionRegistry);
        this.roomService = roomService;
    }

    @MessageMapping("/uno/create")
    public void createRoom(CreateRoomRequest payload, SimpMessageHeaderAccessor headers) {
        handleCreateRoom(payload, headers);
    }

    @MessageMapping("/uno/join")
    public void joinRoom(JoinRoomRequest payload, SimpMessageHeaderAccessor headers) {
        handleJoinRoom(payload, headers);
    }

    @MessageMapping("/uno/settings")
    public void updateSettings(UpdateSettingsPayload payload, SimpMessageHeaderAccessor headers) {
        handleSnapshotAction(headers, clientToken -> roomService.updateSettings(clientToken, payload));
    }

    @MessageMapping("/uno/state")
    public void publishState(PublishStatePayload payload, SimpMessageHeaderAccessor headers) {
        handleSnapshotAction(headers, clientToken -> roomService.publishState(clientToken, payload));
    }

    @MessageMapping("/uno/action")
    public void submitAction(SubmitActionPayload payload, SimpMessageHeaderAccessor headers) {
        handleSnapshotAction(headers, clientToken -> roomService.submitAction(clientToken, payload));
    }

    @MessageMapping("/uno/leave")
    public void leaveRoom(RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
        handleLeaveRoom(payload, headers);
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        handleDisconnect(event);
    }
}

