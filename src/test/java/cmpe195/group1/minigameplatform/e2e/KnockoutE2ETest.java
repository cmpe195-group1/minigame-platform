package cmpe195.group1.minigameplatform.e2e;

import com.microsoft.playwright.Page;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class KnockoutE2ETest extends FrontendTest {

    @Test
    void opensKnockoutFromHomepage(Page page) {
        useDesktopViewport(page);
        openGameFromHome(page, "knockout");

        assertThat(page.url().toLowerCase()).contains("/games/knockout");
        page.locator("[data-testid='knockout-page']").waitFor();
        page.waitForFunction("""
                () => document.querySelector('[data-testid="knockout-phaser-root"] canvas') !== null
                """);
        assertThat(page.locator("[data-testid='knockout-page'] h1").innerText()).contains("Knockout");
    }
}


