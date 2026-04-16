package cmpe195.group1.minigameplatform.games.sudoku.backend.payload;

import cmpe195.group1.minigameplatform.games.sudoku.backend.model.RoomState;

public class SudokuServerMessage {
    private String type;
    private RoomState roomState;
    private String error;

    public SudokuServerMessage() {
    }

    public SudokuServerMessage(String type, RoomState roomState, String error) {
        this.type = type;
        this.roomState = roomState;
        this.error = error;
    }

    public static SudokuServerMessage roomState(RoomState roomState) {
        return new SudokuServerMessage("ROOM_STATE", roomState, null);
    }

    public static SudokuServerMessage joinError(String error) {
        return new SudokuServerMessage("JOIN_ERROR", null, error);
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public RoomState getRoomState() {
        return roomState;
    }

    public void setRoomState(RoomState roomState) {
        this.roomState = roomState;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }
}
