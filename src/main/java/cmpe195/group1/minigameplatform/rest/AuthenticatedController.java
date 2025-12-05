package cmpe195.group1.minigameplatform.rest;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
