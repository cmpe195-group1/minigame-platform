package cmpe195.group1.minigameplatform.e2e;

import com.microsoft.playwright.Page;
import com.microsoft.playwright.junit.UsePlaywright;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@UsePlaywright
public class ExampleE2ETest extends FrontendTest {

    @Test
    void test(Page page) {
        page.navigate("http://localhost:8001");
        assertThat(page.title()).isEqualTo("minigame-platform");
    }

}
