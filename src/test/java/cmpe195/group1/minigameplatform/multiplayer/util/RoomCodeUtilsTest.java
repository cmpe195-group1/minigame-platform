package cmpe195.group1.minigameplatform.multiplayer.util;

import org.junit.jupiter.api.Test;

import java.util.Random;

import static org.assertj.core.api.Assertions.assertThat;

class RoomCodeUtilsTest {

    @Test
    void normalize_returnsTrimmedUppercaseCode() {
        assertThat(RoomCodeUtils.normalize(" abC12 ")).isEqualTo("ABC12");
    }

    @Test
    void normalize_returnsEmptyStringForNullInput() {
        assertThat(RoomCodeUtils.normalize(null)).isEmpty();
    }

    @Test
    void generate_returnsExpectedLengthAndAlphabet() {
        String generated = RoomCodeUtils.generate(new Random(1234L), "ABC", 8);

        assertThat(generated)
                .hasSize(8)
                .matches("[ABC]+");
    }

    @Test
    void generate_returnsEmptyStringForZeroLength() {
        assertThat(RoomCodeUtils.generate(new Random(1L), "ABC", 0)).isEmpty();
    }
}

