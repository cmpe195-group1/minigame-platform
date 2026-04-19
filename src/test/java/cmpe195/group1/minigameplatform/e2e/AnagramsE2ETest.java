package cmpe195.group1.minigameplatform.e2e;

import com.microsoft.playwright.Page;
import com.microsoft.playwright.junit.UsePlaywright;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@UsePlaywright
class AnagramsE2ETest extends FrontendTest {

    @Test
    void startsLocalAnagramsMatch(Page page) {
        useDesktopViewport(page);
        openGameFromHome(page, "anagrams");

        page.locator("[data-testid='anagrams-player-name-1']").fill("Player One");
        page.locator("[data-testid='anagrams-player-name-2']").fill("Player Two");
        page.waitForFunction("""
                () => {
                    const first = document.querySelector('[data-testid="anagrams-player-name-1"]');
                    const second = document.querySelector('[data-testid="anagrams-player-name-2"]');
                    return first instanceof HTMLInputElement
                        && second instanceof HTMLInputElement
                        && first.value === 'Player One'
                        && second.value === 'Player Two';
                }
                """);
        page.locator("[data-testid='anagrams-start-local-game']").waitFor();
        page.locator("[data-testid='anagrams-start-local-game']").click();
        page.waitForFunction("""
                () => !!document.querySelector('[data-testid="anagrams-active-turn"]')
                    || !!document.querySelector('[data-testid="anagrams-setup-error"]')
                """);

        if (page.locator("[data-testid='anagrams-setup-error']").count() > 0
                && page.locator("[data-testid='anagrams-setup-error']").isVisible()) {
            throw new AssertionError(page.locator("[data-testid='anagrams-setup-error']").innerText());
        }

        assertThat(page.url().toLowerCase()).contains("/games/anagrams");
        assertThat(page.locator("[data-testid='anagrams-active-turn']").innerText())
                .contains("SHARED LETTER POOL")
                .contains("SUBMIT A WORD");
    }
}




