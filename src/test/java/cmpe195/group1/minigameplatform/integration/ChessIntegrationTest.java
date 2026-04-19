package cmpe195.group1.minigameplatform.integration;

import cmpe195.group1.minigameplatform.games.chess.model.ChessGameState;
import cmpe195.group1.minigameplatform.games.chess.model.ChessPiece;
import cmpe195.group1.minigameplatform.games.chess.model.ChessPosition;
import cmpe195.group1.minigameplatform.games.chess.payload.MovePayload;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.stomp.StompSession;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ChessIntegrationTest extends AbstractGameWebSocketIntegrationSupport {

    @Test
    void basicGameplayFlow() throws Exception {
        String hostToken = uniqueToken("chess-host");
        String guestToken = uniqueToken("chess-guest");

        StompSession hostSession = connect();
        StompSession guestSession = connect();

        var hostClientMessages = subscribeClientTopic(hostSession, "chess", hostToken);
        var guestClientMessages = subscribeClientTopic(guestSession, "chess", guestToken);

        send(hostSession, "/app/chess/create", createRoomRequest(hostToken, "Host"));
        var createdRoom = awaitRoomState(hostClientMessages);
        String roomCode = extractRoomCode(createdRoom);

        assertThat(roomCode).isNotBlank();

        var hostRoomMessages = subscribeRoomTopic(hostSession, "chess", roomCode);

        send(guestSession, "/app/chess/join", joinRoomRequest(guestToken, roomCode, "Guest"));
        var joinedRoom = awaitRoomState(guestClientMessages);
        var roomAfterJoin = awaitRoomState(hostRoomMessages);

        assertThat(list(joinedRoom.get("participants"))).hasSize(2);
        assertThat(list(roomAfterJoin.get("participants"))).hasSize(2);

        send(hostSession, "/app/chess/start", roomCodeRequest(roomCode));
        var startedRoom = awaitRoomState(hostRoomMessages);

        assertThat(text(startedRoom, "status")).isEqualTo("playing");
        assertThat(text(map(startedRoom.get("gameState")), "turn")).isEqualTo("white");

        ChessGameState nextState = toGameState(map(startedRoom.get("gameState")));
        nextState.getBoard().get(6).set(4, null);
        nextState.getBoard().get(5).set(4, new ChessPiece("pawn", "white", true));
        nextState.setTurn("black");
        nextState.setSelected(null);

        MovePayload movePayload = new MovePayload();
        movePayload.setRoomCode(roomCode);
        movePayload.setFrom(new ChessPosition(4, 6));
        movePayload.setTo(new ChessPosition(4, 5));
        movePayload.setResultingState(nextState);
        send(hostSession, "/app/chess/move", movePayload);

        var roomAfterMove = awaitRoomState(hostRoomMessages);
        assertThat(intValue(roomAfterMove, "moveCount")).isEqualTo(1);
        assertThat(text(roomAfterMove, "status")).isEqualTo("playing");
        assertThat(text(roomAfterMove, "winner")).isNull();

        Map<String, Object> gameState = map(roomAfterMove.get("gameState"));
        assertThat(text(gameState, "turn")).isEqualTo("black");

        List<Object> board = list(gameState.get("board"));
        assertThat(list(board.get(6)).get(4)).isNull();

        Map<String, Object> movedPiece = map(list(board.get(5)).get(4));
        assertThat(text(movedPiece, "type")).isEqualTo("pawn");
        assertThat(text(movedPiece, "color")).isEqualTo("white");
        assertThat(booleanValue(movedPiece, "hasMoved")).isTrue();
    }

    private ChessGameState toGameState(Map<String, Object> payload) {
        ChessGameState state = new ChessGameState();
        state.setTurn(text(payload, "turn"));
        state.setSelected(toPosition(payload.get("selected")));

        List<List<ChessPiece>> board = new ArrayList<>();
        for (Object rowObject : list(payload.get("board"))) {
            List<ChessPiece> row = new ArrayList<>();
            for (Object cellObject : list(rowObject)) {
                if (cellObject == null) {
                    row.add(null);
                    continue;
                }

                Map<String, Object> piecePayload = map(cellObject);
                row.add(new ChessPiece(
                    text(piecePayload, "type"),
                    text(piecePayload, "color"),
                    booleanValue(piecePayload, "hasMoved")
                ));
            }
            board.add(row);
        }
        state.setBoard(board);
        return state;
    }

    private ChessPosition toPosition(Object payload) {
        if (payload == null) {
            return null;
        }

        Map<String, Object> position = map(payload);
        return new ChessPosition(intValue(position, "x"), intValue(position, "y"));
    }
}

