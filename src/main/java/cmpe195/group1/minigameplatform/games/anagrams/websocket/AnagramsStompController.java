package cmpe195.group1.minigameplatform.games.anagrams.websocket;

import cmpe195.group1.minigameplatform.games.anagrams.model.RoomState;
import cmpe195.group1.minigameplatform.games.anagrams.payload.EndTurnPayload;
import cmpe195.group1.minigameplatform.games.anagrams.payload.PublishStatePayload;
import cmpe195.group1.minigameplatform.games.anagrams.payload.SubmitWordPayload;
import cmpe195.group1.minigameplatform.games.anagrams.payload.UpdateSettingsPayload;
import cmpe195.group1.minigameplatform.games.anagrams.service.RoomService;
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
public class AnagramsStompController extends AbstractSnapshotRoomStompController<RoomState> {

    private final RoomService roomService;

    public AnagramsStompController(
        RoomService roomService,
        SimpMessagingTemplate messagingTemplate,
        StompSessionRegistry sessionRegistry
    ) {
        super("anagrams", roomService, messagingTemplate, sessionRegistry);
        this.roomService = roomService;
    }

    @MessageMapping("/anagrams/create")
    public void createRoom(CreateRoomRequest payload, SimpMessageHeaderAccessor headers) {
        handleCreateRoom(payload, headers);
    }

    @MessageMapping("/anagrams/join")
    public void joinRoom(RoomScopedPayload.JoinRoomRequest payload, SimpMessageHeaderAccessor headers) {
        handleJoinRoom(payload, headers);
    }

    @MessageMapping("/anagrams/settings")
    public void updateSettings(UpdateSettingsPayload payload, SimpMessageHeaderAccessor headers) {
        handleSnapshotAction(headers, clientToken -> roomService.updateSettings(clientToken, payload));
    }

    @MessageMapping("/anagrams/state")
    public void publishState(PublishStatePayload payload, SimpMessageHeaderAccessor headers) {
        handleSnapshotAction(headers, clientToken -> roomService.publishState(clientToken, payload));
    }

    @MessageMapping("/anagrams/submitWord")
    public void submitWord(SubmitWordPayload payload, SimpMessageHeaderAccessor headers) {
        handleSnapshotAction(headers, clientToken -> roomService.submitWord(clientToken, payload));
    }

    @MessageMapping("/anagrams/endTurn")
    public void endTurn(EndTurnPayload payload, SimpMessageHeaderAccessor headers) {
        handleSnapshotAction(headers, clientToken -> roomService.endTurn(clientToken, payload));
    }

    @MessageMapping("/anagrams/leave")
    public void leaveRoom(RoomScopedPayload.RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
        handleLeaveRoom(payload, headers);
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        handleDisconnect(event);
    }
}

