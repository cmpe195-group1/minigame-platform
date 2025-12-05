package cmpe195.group1.minigameplatform.rest;

import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RestController;

/**
 * This class handles all requests not requiring authentication.
 */
@RestController
@Tag(name = "Public", description = "No Authentication Required.")
public class PublicController {
}
