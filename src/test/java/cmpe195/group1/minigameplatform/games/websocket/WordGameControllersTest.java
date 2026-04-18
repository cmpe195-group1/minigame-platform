package cmpe195.group1.minigameplatform.games.websocket;

import cmpe195.group1.minigameplatform.games.anagrams.payload.EndTurnPayload;
import cmpe195.group1.minigameplatform.games.anagrams.payload.PublishStatePayload;
import cmpe195.group1.minigameplatform.games.anagrams.payload.SubmitWordPayload;
import cmpe195.group1.minigameplatform.games.anagrams.payload.UpdateSettingsPayload;
import cmpe195.group1.minigameplatform.games.anagrams.service.RoomService;
import cmpe195.group1.minigameplatform.games.anagrams.websocket.AnagramsStompController;
import cmpe195.group1.minigameplatform.games.trivia.payload.SubmitAnswerPayload;
import cmpe195.group1.minigameplatform.games.trivia.websocket.TriviaStompController;
import cmpe195.group1.minigameplatform.games.uno.payload.SubmitActionPayload;
import cmpe195.group1.minigameplatform.games.uno.websocket.UnoStompController;
import cmpe195.group1.minigameplatform.multiplayer.payload.CreateRoomRequest;
import cmpe195.group1.minigameplatform.multiplayer.payload.RoomScopedPayload;
import cmpe195.group1.minigameplatform.multiplayer.service.RoomActionResult;
import cmpe195.group1.minigameplatform.multiplayer.websocket.StompSessionRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class WordGameControllersTest {

    @Test
    void anagramsController_routesMessagesThroughRoomService() {
        RoomService roomService = mock(RoomService.class);
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        StompSessionRegistry sessionRegistry = new StompSessionRegistry();
        AnagramsStompController controller = new AnagramsStompController(roomService, messagingTemplate, sessionRegistry);

        cmpe195.group1.minigameplatform.games.anagrams.model.RoomState room = new cmpe195.group1.minigameplatform.games.anagrams.model.RoomState();
        room.setRoomCode("ROOMA");
        when(roomService.createRoom(eq("client-a"), any(CreateRoomRequest.class))).thenReturn(room);
        when(roomService.joinRoom(eq("client-b"), any(RoomScopedPayload.JoinRoomRequest.class))).thenReturn(RoomActionResult.ok(room));
        when(roomService.roomCodeOf(room)).thenReturn("ROOMA");
        when(roomService.updateSettings(eq("client-a"), any(UpdateSettingsPayload.class))).thenReturn(room);
        when(roomService.publishState(eq("client-a"), any(PublishStatePayload.class))).thenReturn(room);
        when(roomService.submitWord(eq("client-a"), any(SubmitWordPayload.class))).thenReturn(room);
        when(roomService.endTurn(eq("client-a"), any(EndTurnPayload.class))).thenReturn(room);
        when(roomService.disconnect(anyString(), eq("ROOMA"))).thenReturn(room);

        controller.createRoom(createRequest("client-a"), headers("session-a"));
        controller.joinRoom(joinRequest("client-b", "ROOMA"), headers("session-b"));
        controller.updateSettings(roomPayload(new UpdateSettingsPayload(), "ROOMA"), headers("session-a"));
        controller.publishState(roomPayload(new PublishStatePayload(), "ROOMA"), headers("session-a"));
        controller.submitWord(roomPayload(wordPayload("ROOMA", "planet"), "ROOMA"), headers("session-a"));
        controller.endTurn(roomPayload(new EndTurnPayload(), "ROOMA"), headers("session-a"));
        controller.leaveRoom(roomPayload(new RoomScopedPayload.RoomCodeRequest(), "ROOMA"), headers("session-a"));
        sessionRegistry.bindClient("session-c", "client-c");
        sessionRegistry.setRoomCode("session-c", "ROOMA");
        controller.onDisconnect(disconnectEvent("session-c"));

        verify(roomService).createRoom(eq("client-a"), any(CreateRoomRequest.class));
        verify(roomService).joinRoom(eq("client-b"), any(RoomScopedPayload.JoinRoomRequest.class));
        verify(roomService).updateSettings(eq("client-a"), any(UpdateSettingsPayload.class));
        verify(roomService).publishState(eq("client-a"), any(PublishStatePayload.class));
        verify(roomService).submitWord(eq("client-a"), any(SubmitWordPayload.class));
        verify(roomService).endTurn(eq("client-a"), any(EndTurnPayload.class));
        verify(roomService, times(2)).disconnect(anyString(), eq("ROOMA"));
        verify(messagingTemplate).convertAndSend(eq("/topic/anagrams/client/client-a"), any(Object.class));
        verify(messagingTemplate, atLeastOnce()).convertAndSend(eq("/topic/anagrams/room/ROOMA"), any(Object.class));
        assertThat(sessionRegistry.remove("session-a").getRoomCode()).isNull();
    }

    @Test
    void triviaController_routesMessagesThroughRoomService() {
        cmpe195.group1.minigameplatform.games.trivia.service.RoomService roomService = mock(cmpe195.group1.minigameplatform.games.trivia.service.RoomService.class);
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        StompSessionRegistry sessionRegistry = new StompSessionRegistry();
        TriviaStompController controller = new TriviaStompController(roomService, messagingTemplate, sessionRegistry);

        cmpe195.group1.minigameplatform.games.trivia.model.RoomState room = new cmpe195.group1.minigameplatform.games.trivia.model.RoomState();
        room.setRoomCode("ROOMT");
        when(roomService.createRoom(eq("client-t"), any(CreateRoomRequest.class))).thenReturn(room);
        when(roomService.joinRoom(eq("client-u"), any(RoomScopedPayload.JoinRoomRequest.class))).thenReturn(RoomActionResult.ok(room));
        when(roomService.roomCodeOf(room)).thenReturn("ROOMT");
        when(roomService.updateSettings(eq("client-t"), any(cmpe195.group1.minigameplatform.games.trivia.payload.UpdateSettingsPayload.class))).thenReturn(room);
        when(roomService.publishState(eq("client-t"), any(cmpe195.group1.minigameplatform.games.trivia.payload.PublishStatePayload.class))).thenReturn(room);
        when(roomService.submitAnswer(eq("client-t"), any(SubmitAnswerPayload.class))).thenReturn(room);
        when(roomService.disconnect(anyString(), eq("ROOMT"))).thenReturn(room);

        controller.createRoom(createRequest("client-t"), headers("session-t"));
        controller.joinRoom(joinRequest("client-u", "ROOMT"), headers("session-u"));
        controller.updateSettings(roomPayload(new cmpe195.group1.minigameplatform.games.trivia.payload.UpdateSettingsPayload(), "ROOMT"), headers("session-t"));
        controller.publishState(roomPayload(new cmpe195.group1.minigameplatform.games.trivia.payload.PublishStatePayload(), "ROOMT"), headers("session-t"));
        controller.submitAnswer(answerPayload("ROOMT", "42"), headers("session-t"));
        controller.leaveRoom(roomPayload(new RoomScopedPayload.RoomCodeRequest(), "ROOMT"), headers("session-t"));
        sessionRegistry.bindClient("session-v", "client-v");
        sessionRegistry.setRoomCode("session-v", "ROOMT");
        controller.onDisconnect(disconnectEvent("session-v"));

        verify(roomService).createRoom(eq("client-t"), any(CreateRoomRequest.class));
        verify(roomService).joinRoom(eq("client-u"), any(RoomScopedPayload.JoinRoomRequest.class));
        verify(roomService).updateSettings(eq("client-t"), any(cmpe195.group1.minigameplatform.games.trivia.payload.UpdateSettingsPayload.class));
        verify(roomService).publishState(eq("client-t"), any(cmpe195.group1.minigameplatform.games.trivia.payload.PublishStatePayload.class));
        verify(roomService).submitAnswer(eq("client-t"), any(SubmitAnswerPayload.class));
        verify(roomService, times(2)).disconnect(anyString(), eq("ROOMT"));
        verify(messagingTemplate).convertAndSend(eq("/topic/trivia/client/client-t"), any(Object.class));
        verify(messagingTemplate, atLeastOnce()).convertAndSend(eq("/topic/trivia/room/ROOMT"), any(Object.class));
    }

    @Test
    void unoController_routesMessagesThroughRoomService() {
        cmpe195.group1.minigameplatform.games.uno.service.RoomService roomService = mock(cmpe195.group1.minigameplatform.games.uno.service.RoomService.class);
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        StompSessionRegistry sessionRegistry = new StompSessionRegistry();
        UnoStompController controller = new UnoStompController(roomService, messagingTemplate, sessionRegistry);

        cmpe195.group1.minigameplatform.games.uno.model.RoomState room = new cmpe195.group1.minigameplatform.games.uno.model.RoomState();
        room.setRoomCode("ROOMU");
        when(roomService.createRoom(eq("client-uno"), any(CreateRoomRequest.class))).thenReturn(room);
        when(roomService.joinRoom(eq("client-join"), any(RoomScopedPayload.JoinRoomRequest.class))).thenReturn(RoomActionResult.ok(room));
        when(roomService.roomCodeOf(room)).thenReturn("ROOMU");
        when(roomService.updateSettings(eq("client-uno"), any(cmpe195.group1.minigameplatform.games.uno.payload.UpdateSettingsPayload.class))).thenReturn(room);
        when(roomService.publishState(eq("client-uno"), any(cmpe195.group1.minigameplatform.games.uno.payload.PublishStatePayload.class))).thenReturn(room);
        when(roomService.submitAction(eq("client-uno"), any(SubmitActionPayload.class))).thenReturn(room);
        when(roomService.disconnect(anyString(), eq("ROOMU"))).thenReturn(room);

        controller.createRoom(createRequest("client-uno"), headers("session-uno"));
        controller.joinRoom(joinRequest("client-join", "ROOMU"), headers("session-join"));
        controller.updateSettings(roomPayload(new cmpe195.group1.minigameplatform.games.uno.payload.UpdateSettingsPayload(), "ROOMU"), headers("session-uno"));
        controller.publishState(roomPayload(new cmpe195.group1.minigameplatform.games.uno.payload.PublishStatePayload(), "ROOMU"), headers("session-uno"));
        controller.submitAction(actionPayload("ROOMU", "draw_card"), headers("session-uno"));
        controller.leaveRoom(roomPayload(new RoomScopedPayload.RoomCodeRequest(), "ROOMU"), headers("session-uno"));
        sessionRegistry.bindClient("session-disc", "client-disc");
        sessionRegistry.setRoomCode("session-disc", "ROOMU");
        controller.onDisconnect(disconnectEvent("session-disc"));

        verify(roomService).createRoom(eq("client-uno"), any(CreateRoomRequest.class));
        verify(roomService).joinRoom(eq("client-join"), any(RoomScopedPayload.JoinRoomRequest.class));
        verify(roomService).updateSettings(eq("client-uno"), any(cmpe195.group1.minigameplatform.games.uno.payload.UpdateSettingsPayload.class));
        verify(roomService).publishState(eq("client-uno"), any(cmpe195.group1.minigameplatform.games.uno.payload.PublishStatePayload.class));
        verify(roomService).submitAction(eq("client-uno"), any(SubmitActionPayload.class));
        verify(roomService, times(2)).disconnect(anyString(), eq("ROOMU"));
        verify(messagingTemplate).convertAndSend(eq("/topic/uno/client/client-uno"), any(Object.class));
        verify(messagingTemplate, atLeastOnce()).convertAndSend(eq("/topic/uno/room/ROOMU"), any(Object.class));
    }

    private CreateRoomRequest createRequest(String clientToken) {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setClientToken(clientToken);
        return request;
    }

    private RoomScopedPayload.JoinRoomRequest joinRequest(String clientToken, String roomCode) {
        RoomScopedPayload.JoinRoomRequest request = new RoomScopedPayload.JoinRoomRequest();
        request.setClientToken(clientToken);
        request.setRoomCode(roomCode);
        return request;
    }

    private <T extends RoomScopedPayload> T roomPayload(T payload, String roomCode) {
        payload.setRoomCode(roomCode);
        return payload;
    }

    private SubmitWordPayload wordPayload(String roomCode, String word) {
        SubmitWordPayload payload = new SubmitWordPayload();
        payload.setRoomCode(roomCode);
        payload.setWord(word);
        return payload;
    }

    private SubmitAnswerPayload answerPayload(String roomCode, String answer) {
        SubmitAnswerPayload payload = new SubmitAnswerPayload();
        payload.setRoomCode(roomCode);
        payload.setAnswer(answer);
        return payload;
    }

    private SubmitActionPayload actionPayload(String roomCode, String kind) {
        SubmitActionPayload payload = new SubmitActionPayload();
        payload.setRoomCode(roomCode);
        payload.setKind(kind);
        return payload;
    }

    private SimpMessageHeaderAccessor headers(String sessionId) {
        SimpMessageHeaderAccessor headers = mock(SimpMessageHeaderAccessor.class);
        when(headers.getSessionId()).thenReturn(sessionId);
        return headers;
    }

    private SessionDisconnectEvent disconnectEvent(String sessionId) {
        SessionDisconnectEvent event = mock(SessionDisconnectEvent.class);
        when(event.getSessionId()).thenReturn(sessionId);
        return event;
    }
}


