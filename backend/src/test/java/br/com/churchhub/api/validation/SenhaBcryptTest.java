package br.com.churchhub.api.validation;

import br.com.churchhub.api.dto.LoginRequest;
import br.com.churchhub.api.dto.ResetPasswordRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** "é" ocupa 2 bytes em UTF-8: 36 cabem no BCrypt (72 bytes), 37 não (74 bytes). */
class SenhaBcryptTest {

    private static final String ACENTUADA_NO_LIMITE = "é".repeat(36);
    private static final String ACENTUADA_ACIMA = "é".repeat(37);
    private static final String MENSAGEM_RESET = "A nova senha é longa demais: o limite é de 72 bytes "
            + "(letras acentuadas e símbolos ocupam 2 ou mais)";

    private static ValidatorFactory fabrica;
    private static Validator validator;

    @BeforeAll
    static void criarValidador() {
        fabrica = Validation.buildDefaultValidatorFactory();
        validator = fabrica.getValidator();
    }

    @AfterAll
    static void fecharValidador() {
        fabrica.close();
    }

    @Test
    void bcryptRecusaMaisDe72BytesMesmoComMenosDe72Caracteres() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

        assertThat(encoder.matches(ACENTUADA_NO_LIMITE, encoder.encode(ACENTUADA_NO_LIMITE))).isTrue();
        assertThatThrownBy(() -> encoder.encode(ACENTUADA_ACIMA)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void contaBytesEmUtf8ENaoCaracteres() {
        assertThat(SenhaBcrypt.cabe("a".repeat(72))).isTrue();
        assertThat(SenhaBcrypt.cabe("a".repeat(73))).isFalse();
        assertThat(SenhaBcrypt.cabe(ACENTUADA_NO_LIMITE)).isTrue();
        assertThat(SenhaBcrypt.cabe(ACENTUADA_ACIMA)).isFalse();
        assertThat(SenhaBcrypt.cabe("😀".repeat(18))).isTrue();   // 4 bytes cada
        assertThat(SenhaBcrypt.cabe("😀".repeat(19))).isFalse();
        assertThat(SenhaBcrypt.cabe(null)).isTrue();
    }

    @Test
    void resetAceitaSenhaAcentuadaNoLimiteERecusaUmByteAlem() {
        assertThat(validator.validate(new ResetPasswordRequest("token", ACENTUADA_NO_LIMITE))).isEmpty();

        // 37 caracteres passam no @Size(6, 72); só o limite em bytes acusa.
        Set<ConstraintViolation<ResetPasswordRequest>> violacoes =
                validator.validate(new ResetPasswordRequest("token", ACENTUADA_ACIMA));
        assertThat(violacoes).extracting(ConstraintViolation::getMessage).containsExactly(MENSAGEM_RESET);
    }

    @Test
    void loginRecusaSenhaQueNaoCabeNoBcrypt() {
        assertThat(validator.validate(new LoginRequest("ana@igreja.org", ACENTUADA_NO_LIMITE))).isEmpty();
        assertThat(validator.validate(new LoginRequest("ana@igreja.org", ACENTUADA_ACIMA)))
                .extracting(ConstraintViolation::getMessage)
                .containsExactly("A senha é longa demais: o limite é de 72 bytes "
                        + "(letras acentuadas e símbolos ocupam 2 ou mais)");
    }
}
