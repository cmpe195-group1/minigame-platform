package cmpe195.group1.minigameplatform;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import lombok.Generated;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@OpenAPIDefinition(
        info = @Info(title = "Apex Identify API")
)
@SecurityScheme(type = SecuritySchemeType.HTTP, bearerFormat = "jwt", name = "bearerAuth", scheme = "bearer",
        in = SecuritySchemeIn.HEADER)
public class RestApplication {

    @Generated // exclude from test coverage
    static void main(String[] args) {
        SpringApplication.run(RestApplication.class, args);
    }

}
