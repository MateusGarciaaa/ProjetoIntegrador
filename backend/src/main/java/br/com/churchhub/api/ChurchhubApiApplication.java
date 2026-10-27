package br.com.churchhub.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan   // registra todo record @ConfigurationProperties de config.properties
public class ChurchhubApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(ChurchhubApiApplication.class, args);
	}

}
