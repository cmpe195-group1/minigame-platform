package cmpe195.group1.minigameplatform.sudoku.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration;

@SpringBootApplication(exclude = {
        DataSourceAutoConfiguration.class
})
public class SudokuBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(SudokuBackendApplication.class, args);
    }
}
