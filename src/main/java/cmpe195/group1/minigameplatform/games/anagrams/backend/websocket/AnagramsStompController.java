package cmpe195.group1.minigameplatform.games.anagrams.backend.websocket;

import cmpe195.group1.minigameplatform.games.anagrams.backend.model.RoomState;
import cmpe195.group1.minigameplatform.games.anagrams.backend.payload.EndTurnPayload;
import cmpe195.group1.minigameplatform.games.anagrams.backend.payload.PublishStatePayload;
import cmpe195.group1.minigameplatform.games.anagrams.backend.payload.SubmitWordPayload;
import cmpe195.group1.minigameplatform.games.anagrams.backend.payload.UpdateSettingsPayload;
import cmpe195.group1.minigameplatform.games.anagrams.backend.service.RoomService;
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
    public void joinRoom(JoinRoomRequest payload, SimpMessageHeaderAccessor headers) {
        handleJoinRoom(payload, headers);
    }

    @MessageMapping("/anagrams/settings")
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

    @MessageMapping("/anagrams/state")
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

    @MessageMapping("/anagrams/submitWord")
    public void submitWord(SubmitWordPayload payload, SimpMessageHeaderAccessor headers) {
        String clientToken = getClientToken(headers);
        if (clientToken == null) {
            return;
        }

        RoomState room = roomService.submitWord(clientToken, payload);
        if (room != null) {
            broadcastRoom(room.getRoomCode(), room);
        }
    }

    @MessageMapping("/anagrams/endTurn")
    public void endTurn(EndTurnPayload payload, SimpMessageHeaderAccessor headers) {
        String clientToken = getClientToken(headers);
        if (clientToken == null) {
            return;
        }

        RoomState room = roomService.endTurn(clientToken, payload);
        if (room != null) {
            broadcastRoom(room.getRoomCode(), room);
        }
    }

    @MessageMapping("/anagrams/leave")
    public void leaveRoom(RoomCodeRequest payload, SimpMessageHeaderAccessor headers) {
        handleLeaveRoom(payload, headers);
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        handleDisconnect(event);
    }
}

