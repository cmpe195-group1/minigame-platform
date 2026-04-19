package cmpe195.group1.minigameplatform.integration;

import cmpe195.group1.minigameplatform.games.checkers.model.CheckersGameState;
import cmpe195.group1.minigameplatform.games.checkers.model.CheckersPiece;
import cmpe195.group1.minigameplatform.games.checkers.model.CheckersPosition;
import cmpe195.group1.minigameplatform.games.checkers.payload.MovePayload;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.stomp.StompSession;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CheckersIntegrationTest extends AbstractGameWebSocketIntegrationSupport {

    @Test
    void basicGameplayFlow() throws Exception {
        String hostToken = uniqueToken("checkers-host");
        String guestToken = uniqueToken("checkers-guest");

        StompSession hostSession = connect();
        StompSession guestSession = connect();

        var hostClientMessages = subscribeClientTopic(hostSession, "checkers", hostToken);
        var guestClientMessages = subscribeClientTopic(guestSession, "checkers", guestToken);

        send(hostSession, "/app/checkers/create", createRoomRequest(hostToken, "Host"));
        var createdRoom = awaitRoomState(hostClientMessages);
        String roomCode = extractRoomCode(createdRoom);

        assertThat(roomCode).isNotBlank();

        var hostRoomMessages = subscribeRoomTopic(hostSession, "checkers", roomCode);

        send(guestSession, "/app/checkers/join", joinRoomRequest(guestToken, roomCode, "Guest"));
        var joinedRoom = awaitRoomState(guestClientMessages);
        var roomAfterJoin = awaitRoomState(hostRoomMessages);

        assertThat(list(joinedRoom.get("participants"))).hasSize(2);
        assertThat(list(roomAfterJoin.get("participants"))).hasSize(2);

        send(hostSession, "/app/checkers/start", roomCodeRequest(roomCode));
        var startedRoom = awaitRoomState(hostRoomMessages);

        assertThat(text(startedRoom, "status")).isEqualTo("playing");
        assertThat(text(map(startedRoom.get("gameState")), "turn")).isEqualTo("white");

        CheckersGameState nextState = toGameState(map(startedRoom.get("gameState")));
        nextState.getBoard().get(5).set(0, null);
        nextState.getBoard().get(4).set(1, new CheckersPiece("white", false));
        nextState.setTurn("black");
        nextState.setSelected(null);

        MovePayload movePayload = new MovePayload();
        movePayload.setRoomCode(roomCode);
        movePayload.setFrom(new CheckersPosition(0, 5));
        movePayload.setTo(new CheckersPosition(1, 4));
        movePayload.setResultingState(nextState);
        send(hostSession, "/app/checkers/move", movePayload);

        var roomAfterMove = awaitRoomState(hostRoomMessages);
        assertThat(intValue(roomAfterMove, "moveCount")).isEqualTo(1);
        assertThat(text(map(roomAfterMove.get("gameState")), "turn")).isEqualTo("black");
    }

    private CheckersGameState toGameState(java.util.Map<String, Object> payload) {
        CheckersGameState state = new CheckersGameState();
        state.setTurn(text(payload, "turn"));
        state.setSelected(null);

        List<List<CheckersPiece>> board = new ArrayList<>();
        for (Object rowObject : list(payload.get("board"))) {
            List<CheckersPiece> row = new ArrayList<>();
            for (Object cellObject : list(rowObject)) {
                if (cellObject == null) {
                    row.add(null);
                    continue;
                }

                var piecePayload = map(cellObject);
                row.add(new CheckersPiece(text(piecePayload, "color"), booleanValue(piecePayload, "king")));
            }
            board.add(row);
        }
        state.setBoard(board);
        return state;
    }
}


