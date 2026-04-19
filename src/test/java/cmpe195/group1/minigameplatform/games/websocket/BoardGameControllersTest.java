package cmpe195.group1.minigameplatform.games.websocket;

import cmpe195.group1.minigameplatform.games.checkers.payload.MovePayload;
import cmpe195.group1.minigameplatform.games.checkers.service.CheckersRoomService;
import cmpe195.group1.minigameplatform.games.checkers.websocket.CheckersStompController;
import cmpe195.group1.minigameplatform.games.sudoku.payload.MakeMovePayload;
import cmpe195.group1.minigameplatform.games.sudoku.websocket.SudokuStompController;
import cmpe195.group1.minigameplatform.multiplayer.payload.CreateRoomRequest;
import cmpe195.group1.minigameplatform.multiplayer.payload.RoomScopedPayload;
import cmpe195.group1.minigameplatform.multiplayer.service.RoomActionResult;
import cmpe195.group1.minigameplatform.multiplayer.websocket.StompSessionRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class BoardGameControllersTest {

    @Test
    void sudokuController_routesMessagesThroughRoomService() {
        cmpe195.group1.minigameplatform.games.sudoku.service.RoomService roomService = mock(cmpe195.group1.minigameplatform.games.sudoku.service.RoomService.class);
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        StompSessionRegistry sessionRegistry = new StompSessionRegistry();
        SudokuStompController controller = new SudokuStompController(roomService, messagingTemplate, sessionRegistry);

        cmpe195.group1.minigameplatform.games.sudoku.model.RoomState room = new cmpe195.group1.minigameplatform.games.sudoku.model.RoomState();
        room.setRoomCode("ROOMS");
        when(roomService.createRoom(eq("client-s"), any(CreateRoomRequest.class))).thenReturn(room);
        when(roomService.joinRoom(eq("client-j"), any(RoomScopedPayload.JoinRoomRequest.class))).thenReturn(RoomActionResult.ok(room));
        when(roomService.roomCodeOf(room)).thenReturn("ROOMS");
        when(roomService.startGame(eq("client-s"), eq("ROOMS"))).thenReturn(room);
        when(roomService.makeMove(eq("client-s"), any(MakeMovePayload.class))).thenReturn(room);
        when(roomService.newPuzzle(eq("client-s"), eq("ROOMS"))).thenReturn(room);
        when(roomService.restart(eq("client-s"), eq("ROOMS"))).thenReturn(room);
        when(roomService.disconnect(anyString(), eq("ROOMS"))).thenReturn(room);

        controller.createRoom(createRequest("client-s"), headers("session-s"));
        controller.joinRoom(joinRequest("client-j", "ROOMS"), headers("session-j"));
        controller.startGame(roomPayload(new RoomScopedPayload.RoomCodeRequest(), "ROOMS"), headers("session-s"));
        controller.makeMove(sudokuMovePayload("ROOMS"), headers("session-s"));
        controller.newPuzzle(roomPayload(new RoomScopedPayload.RoomCodeRequest(), "ROOMS"), headers("session-s"));
        controller.restart(roomPayload(new RoomScopedPayload.RoomCodeRequest(), "ROOMS"), headers("session-s"));
        controller.leaveRoom(roomPayload(new RoomScopedPayload.RoomCodeRequest(), "ROOMS"), headers("session-s"));
        sessionRegistry.bindClient("session-disc", "client-disc");
        sessionRegistry.setRoomCode("session-disc", "ROOMS");
        controller.onDisconnect(disconnectEvent("session-disc"));

        verify(roomService).createRoom(eq("client-s"), any(CreateRoomRequest.class));
        verify(roomService).joinRoom(eq("client-j"), any(RoomScopedPayload.JoinRoomRequest.class));
        verify(roomService).startGame(eq("client-s"), eq("ROOMS"));
        verify(roomService).makeMove(eq("client-s"), any(MakeMovePayload.class));
        verify(roomService).newPuzzle(eq("client-s"), eq("ROOMS"));
        verify(roomService).restart(eq("client-s"), eq("ROOMS"));
        verify(roomService, times(2)).disconnect(anyString(), eq("ROOMS"));
        verify(messagingTemplate).convertAndSend(eq("/topic/sudoku/client/client-s"), any(Object.class));
        verify(messagingTemplate, atLeastOnce()).convertAndSend(eq("/topic/sudoku/room/ROOMS"), any(Object.class));
    }

    @Test
    void checkersController_routesMessagesThroughRoomService() {
        CheckersRoomService roomService = mock(CheckersRoomService.class);
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        StompSessionRegistry sessionRegistry = new StompSessionRegistry();
        CheckersStompController controller = new CheckersStompController(roomService, messagingTemplate, sessionRegistry);

        cmpe195.group1.minigameplatform.games.checkers.model.RoomState room = new cmpe195.group1.minigameplatform.games.checkers.model.RoomState();
        room.setRoomCode("ROOMC");
        when(roomService.createRoom(eq("client-c"), any(CreateRoomRequest.class))).thenReturn(room);
        when(roomService.joinRoom(eq("client-g"), any(RoomScopedPayload.JoinRoomRequest.class))).thenReturn(RoomActionResult.ok(room));
        when(roomService.roomCodeOf(room)).thenReturn("ROOMC");
        when(roomService.startGame(eq("client-c"), eq("ROOMC"))).thenReturn(room);
        when(roomService.makeMove(eq("client-c"), any(MovePayload.class))).thenReturn(room);
        when(roomService.reset(eq("client-c"), eq("ROOMC"))).thenReturn(room);
        when(roomService.disconnect(anyString(), eq("ROOMC"))).thenReturn(room);

        controller.createRoom(createRequest("client-c"), headers("session-c"));
        controller.joinRoom(joinRequest("client-g", "ROOMC"), headers("session-g"));
        controller.startGame(roomPayload(new RoomScopedPayload.RoomCodeRequest(), "ROOMC"), headers("session-c"));
        controller.move(checkersMovePayload("ROOMC"), headers("session-c"));
        controller.reset(roomPayload(new RoomScopedPayload.RoomCodeRequest(), "ROOMC"), headers("session-c"));
        controller.leave(roomPayload(new RoomScopedPayload.RoomCodeRequest(), "ROOMC"), headers("session-c"));
        sessionRegistry.bindClient("session-disc2", "client-disc2");
        sessionRegistry.setRoomCode("session-disc2", "ROOMC");
        controller.onDisconnect(disconnectEvent("session-disc2"));

        verify(roomService).createRoom(eq("client-c"), any(CreateRoomRequest.class));
        verify(roomService).joinRoom(eq("client-g"), any(RoomScopedPayload.JoinRoomRequest.class));
        verify(roomService).startGame(eq("client-c"), eq("ROOMC"));
        verify(roomService).makeMove(eq("client-c"), any(MovePayload.class));
        verify(roomService).reset(eq("client-c"), eq("ROOMC"));
        verify(roomService, times(2)).disconnect(anyString(), eq("ROOMC"));
        verify(messagingTemplate).convertAndSend(eq("/topic/checkers/client/client-c"), any(Object.class));
        verify(messagingTemplate, atLeastOnce()).convertAndSend(eq("/topic/checkers/room/ROOMC"), any(Object.class));
    }

    @Test
    void sudokuController_passesNullRoomCodeWhenActionPayloadIsMissing() {
        cmpe195.group1.minigameplatform.games.sudoku.service.RoomService roomService = mock(cmpe195.group1.minigameplatform.games.sudoku.service.RoomService.class);
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        StompSessionRegistry sessionRegistry = new StompSessionRegistry();
        SudokuStompController controller = new SudokuStompController(roomService, messagingTemplate, sessionRegistry);

        sessionRegistry.bindClient("session-s", "client-s");
        when(roomService.startGame("client-s", null)).thenReturn(null);
        when(roomService.newPuzzle("client-s", null)).thenReturn(null);
        when(roomService.restart("client-s", null)).thenReturn(null);

        controller.startGame(null, headers("session-s"));
        controller.newPuzzle(null, headers("session-s"));
        controller.restart(null, headers("session-s"));

        verify(roomService).startGame("client-s", null);
        verify(roomService).newPuzzle("client-s", null);
        verify(roomService).restart("client-s", null);
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    void checkersController_passesNullRoomCodeWhenActionPayloadIsMissing() {
        CheckersRoomService roomService = mock(CheckersRoomService.class);
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        StompSessionRegistry sessionRegistry = new StompSessionRegistry();
        CheckersStompController controller = new CheckersStompController(roomService, messagingTemplate, sessionRegistry);

        sessionRegistry.bindClient("session-c", "client-c");
        when(roomService.startGame("client-c", null)).thenReturn(null);
        when(roomService.reset("client-c", null)).thenReturn(null);

        controller.startGame(null, headers("session-c"));
        controller.reset(null, headers("session-c"));

        verify(roomService).startGame("client-c", null);
        verify(roomService).reset("client-c", null);
        verifyNoInteractions(messagingTemplate);
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

    private MakeMovePayload sudokuMovePayload(String roomCode) {
        MakeMovePayload payload = new MakeMovePayload();
        payload.setRoomCode(roomCode);
        return payload;
    }

    private MovePayload checkersMovePayload(String roomCode) {
        MovePayload payload = new MovePayload();
        payload.setRoomCode(roomCode);
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


