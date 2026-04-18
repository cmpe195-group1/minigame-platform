package cmpe195.group1.minigameplatform.integration;

import cmpe195.group1.minigameplatform.games.sudoku.model.SudokuCell;
import cmpe195.group1.minigameplatform.games.sudoku.payload.MakeMovePayload;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.stomp.StompSession;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class SudokuIntegrationTest extends AbstractGameWebSocketIntegrationSupport {

    @Test
    void basicGameplayFlow() throws Exception {
        String hostToken = uniqueToken("sudoku-host");
        String guestToken = uniqueToken("sudoku-guest");

        StompSession hostSession = connect();
        StompSession guestSession = connect();

        var hostClientMessages = subscribeClientTopic(hostSession, "sudoku", hostToken);
        var guestClientMessages = subscribeClientTopic(guestSession, "sudoku", guestToken);

        send(hostSession, "/app/sudoku/create", createRoomRequest(hostToken, "Host"));
        var createdRoom = awaitRoomState(hostClientMessages);
        String roomCode = extractRoomCode(createdRoom);

        assertThat(roomCode).isNotBlank();

        var hostRoomMessages = subscribeRoomTopic(hostSession, "sudoku", roomCode);

        send(guestSession, "/app/sudoku/join", joinRoomRequest(guestToken, roomCode, "Guest"));
        var joinedRoom = awaitRoomState(guestClientMessages);
        var roomAfterJoin = awaitRoomState(hostRoomMessages);

        assertThat(list(joinedRoom.get("participants"))).hasSize(2);
        assertThat(list(roomAfterJoin.get("participants"))).hasSize(2);

        send(hostSession, "/app/sudoku/start", roomCodeRequest(roomCode));
        var startedRoom = awaitRoomState(hostRoomMessages);

        assertThat(text(startedRoom, "status")).isEqualTo("playing");
        assertThat(list(startedRoom.get("board"))).hasSize(9);

        SudokuCell editableCell = findEditableCell(list(startedRoom.get("board")));

        MakeMovePayload movePayload = new MakeMovePayload();
        movePayload.setRoomCode(roomCode);
        movePayload.setRow(editableCell.getRow());
        movePayload.setCol(editableCell.getCol());
        movePayload.setNum(editableCell.getSolvedValue());
        send(hostSession, "/app/sudoku/makeMove", movePayload);

        var roomAfterMove = awaitRoomState(hostRoomMessages);
        List<Object> updatedBoard = list(roomAfterMove.get("board"));
        SudokuCell updatedCell = toSudokuCell(list(updatedBoard.get(editableCell.getRow())).get(editableCell.getCol()));

        assertThat(intValue(roomAfterMove, "moveCount")).isEqualTo(1);
        assertThat(booleanValue(roomAfterMove, "lastMoveCorrect")).isTrue();
        assertThat(updatedCell.getValue()).isEqualTo(editableCell.getSolvedValue());
    }

    private SudokuCell findEditableCell(List<Object> board) {
        for (Object rowObject : board) {
            for (Object cellObject : list(rowObject)) {
                SudokuCell cell = toSudokuCell(cellObject);
                if (!cell.isGiven() && cell.getValue() == 0) {
                    return cell;
                }
            }
        }
        throw new IllegalStateException("Expected at least one editable sudoku cell");
    }

    private SudokuCell toSudokuCell(Object cellObject) {
        Map<String, Object> cell = map(cellObject);
        return new SudokuCell(
            intValue(cell, "row"),
            intValue(cell, "col"),
            intValue(cell, "value"),
            booleanValue(cell, "given"),
            cell.get("playerId") instanceof Number number ? number.intValue() : null,
            cell.get("correct") instanceof Boolean correct ? correct : null,
            intValue(cell, "solvedValue")
        );
    }
}


