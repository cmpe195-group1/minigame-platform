package cmpe195.group1.minigameplatform.rest;

import cmpe195.group1.minigameplatform.SecurityConfiguration;
import cmpe195.group1.minigameplatform.db.User;
import cmpe195.group1.minigameplatform.db.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@WebMvcTest(AuthenticatedController.class)
@Import(SecurityConfiguration.class)
class AuthenticatedControllerTest {

    @Autowired MockMvcTester mockMvcTester;
    @MockitoBean UserRepository userRepository;
//    @MockitoBean JwtDecoder jwtDecoder;

    /** Unauthenticated request should be rejected. */
    @Test
    void signIn_unauthenticated_returns4xx() {
        assertThat(mockMvcTester.get().uri("/auth/signin"))
                .hasStatus4xxClientError();
        verify(userRepository, never()).save(any());
    }

    /** First sign-in: user does not exist yet → a new User should be saved. */
    @Test
    void signIn_newUser_savesUser() {
        var userId = "user-123";
        var email  = "test@example.com";

        when(userRepository.existsById(userId)).thenReturn(false);

        assertThat(mockMvcTester.get().uri("/auth/signin")
                .with(SecurityMockMvcRequestPostProcessors.jwt()
                        .jwt(jwt -> jwt.subject(userId).claim("email", email)))
        ).hasStatusOk();

        var captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertThat(saved.getId()).isEqualTo(userId);
        assertThat(saved.getEmail()).isEqualTo(email);
        assertThat(saved.getCreated()).isNotNull();
    }

    /** Repeat sign-in: user already exists → save should NOT be called. */
    @Test
    void signIn_existingUser_doesNotSave() {
        var userId = "user-existing";

        when(userRepository.existsById(userId)).thenReturn(true);

        assertThat(mockMvcTester.get().uri("/auth/signin")
                .with(SecurityMockMvcRequestPostProcessors.jwt()
                        .jwt(jwt -> jwt.subject(userId).claim("email", "existing@example.com")))
        ).hasStatusOk();

        verify(userRepository, never()).save(any());
    }

    @Test
    void signIn_duplicateKey_returnsBadRequest() {
        var userId = "user-race";

        when(userRepository.existsById(userId)).thenReturn(false);
        when(userRepository.save(any())).thenThrow(
                new DataIntegrityViolationException("duplicate key value violates unique constraint"));

        assertThat(
                mockMvcTester.get().uri("/auth/signin")
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .jwt(jwt -> jwt.subject(userId).claim("email", "race@example.com")))
        ).hasStatus4xxClientError();
    }

    @Test
    void token() {
        assertThat(mockMvcTester.get().uri("/auth/test").with(SecurityMockMvcRequestPostProcessors.jwt()))
                .hasStatusOk()
                .bodyJson().hasPath("$.userId");
        assertThat(mockMvcTester.get().uri("/auth/test"))
                .hasStatus4xxClientError();
        // To set a specific user id, use: SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.subject("hello"))
    }
}