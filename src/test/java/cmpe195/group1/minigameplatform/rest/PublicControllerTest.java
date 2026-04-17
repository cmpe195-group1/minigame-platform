package cmpe195.group1.minigameplatform.rest;

import cmpe195.group1.minigameplatform.SecurityConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

import static org.assertj.core.api.Assertions.assertThat;

@WebMvcTest(PublicController.class)
@Import(SecurityConfiguration.class)
class PublicControllerTest {

    @Autowired MockMvcTester mockMvcTester;

    @Test
    void index() {
        assertThat(mockMvcTester.get().uri("/"))
                .hasStatusOk()
                .bodyText().isEqualTo("Welcome to the Minigame Platform API!");
    }

    @Test
    void ping() {
        assertThat(mockMvcTester.get().uri("/ping").header("X-Test-Header", "TestValue"))
                .hasStatusOk()
                .bodyText().contains("Pong");
    }
}