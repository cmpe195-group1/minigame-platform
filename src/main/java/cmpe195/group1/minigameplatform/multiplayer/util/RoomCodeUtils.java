package cmpe195.group1.minigameplatform.multiplayer.util;

import java.util.Locale;
import java.util.Random;

public final class RoomCodeUtils {

    private RoomCodeUtils() {
    }

    public static String normalize(String roomCode) {
        if (roomCode == null) {
            return "";
        }
        return roomCode.trim().toUpperCase(Locale.ROOT);
    }

    public static String generate(Random random, String chars, int length) {
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < length; i++) {
            code.append(chars.charAt(random.nextInt(chars.length())));
        }
        return code.toString();
    }
}
