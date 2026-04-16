package cmpe195.group1.minigameplatform;

import cmpe195.group1.minigameplatform.rest.PublicController;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import static org.assertj.core.api.Assertions.*;


@SpringBootTest
class RestApplicationTests {

    @Test
    void contextLoads() {
    }

    @Test
    void indexTest() {
        assertThat(new PublicController().index()).isEqualTo("Welcome to the Minigame Platform API!");
    }

}
