package cmpe195.group1.minigameplatform.rest;

import cmpe195.group1.minigameplatform.db.User;
import cmpe195.group1.minigameplatform.db.UserRepository;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * This class handles all authenticated requests.
 * Authenticated means the user has a valid JWT.
 * Any user that is authenticated can access these endpoints.
 */
@RestController
@RequestMapping("/auth")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Authenticated", description = "Any authenticated user can access these endpoints.")
public class AuthenticatedController {

    @Autowired private UserRepository userRepository;

    @GetMapping("/signin")
    public void signIn(JwtAuthenticationToken token) {
        if (!userRepository.existsById(getUserID(token))) {
            var user = new User(getUserID(token), token.getToken().getClaimAsString("email"), Instant.now(), "Anonymous");
            try {
                userRepository.save(user);
            } catch (DataIntegrityViolationException e) {
                if (e.getMessage().contains("duplicate key value violates unique constraint")) {
                    throw new BadRequestException("Duplicate Key", e);
                }
                throw e;
            }
        }
    }


    /**
     * @return the user id and the token passed in
     */
    @GetMapping(path = "/test")
    public Map<String, String> test(JwtAuthenticationToken token) {
        return Map.of("userId", getUserID(token), "token", token.getToken().getTokenValue());
    }

    /**
     * Converts the JWT Auth Token to a user id.
     *
     * @param token JWT Token
     * @return User ID
     */
    private static String getUserID(JwtAuthenticationToken token) {
        return token.getName();
    }

}
