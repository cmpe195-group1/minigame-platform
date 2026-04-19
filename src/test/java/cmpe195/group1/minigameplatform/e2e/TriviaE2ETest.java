package cmpe195.group1.minigameplatform.e2e;

import com.microsoft.playwright.Page;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TriviaE2ETest extends FrontendTest {

    @Test
    void startsLocalTriviaFlow(Page page) {
        useDesktopViewport(page);
        openGameFromHome(page, "trivia");

        page.locator("[data-testid='trivia-mode-local']").click();
        page.locator("[data-testid='trivia-player-name-1']").fill("Player One");
        page.locator("[data-testid='trivia-player-name-2']").fill("Player Two");
        page.locator("[data-testid='trivia-start-local-game']").click();
        page.locator("[data-testid='trivia-local-match']").waitFor();

        assertThat(page.url().toLowerCase()).contains("/games/trivia");
        assertThat(page.locator("[data-testid='trivia-local-match']").innerText())
                .containsAnyOf("Loading the next challenge", "Question", "Question unavailable");
    }
}

