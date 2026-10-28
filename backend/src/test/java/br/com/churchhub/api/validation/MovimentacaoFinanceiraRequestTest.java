package br.com.churchhub.api.validation;

import br.com.churchhub.api.dto.MovimentacaoFinanceiraRequest;
import br.com.churchhub.api.entity.TipoMovimentacao;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/** RN06/RN07 (valor sempre positivo) e RN10 (categoria obrigatória) no corpo de POST/PUT /financial. */
class MovimentacaoFinanceiraRequestTest {

    private static final UUID CATEGORIA = UUID.fromString("3a9d2b1c-6e4f-4a8b-9c2d-000000000001");

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
    void aceitaValorPositivoComCategoria() {
        assertThat(validator.validate(requisicao("0.01", CATEGORIA))).isEmpty();
        assertThat(validator.validate(requisicao("9999999999.99", CATEGORIA))).isEmpty();
    }

    @Test
    void recusaValorZeroOuNegativo() {
        assertThat(mensagens(requisicao("0.00", CATEGORIA))).containsExactly("O valor deve ser positivo");
        assertThat(mensagens(requisicao("-10.00", CATEGORIA))).containsExactly("O valor deve ser positivo");
        assertThat(mensagens(requisicao("0.009", CATEGORIA)))
                .containsExactlyInAnyOrder("O valor deve ser positivo",
                        "O valor deve ter até 10 dígitos inteiros e 2 casas decimais");
    }

    @Test
    void recusaValorAusenteOuForaDoFormato() {
        assertThat(mensagens(requisicao(null, CATEGORIA))).containsExactly("O valor é obrigatório");
        assertThat(mensagens(requisicao("10.123", CATEGORIA)))
                .containsExactly("O valor deve ter até 10 dígitos inteiros e 2 casas decimais");
        assertThat(mensagens(requisicao("10000000000.00", CATEGORIA)))
                .containsExactly("O valor deve ter até 10 dígitos inteiros e 2 casas decimais");
    }

    @Test
    void recusaMovimentacaoSemCategoria() {
        assertThat(mensagens(requisicao("100.00", null))).containsExactly("A categoria é obrigatória");
    }

    private static MovimentacaoFinanceiraRequest requisicao(String valor, UUID categoriaId) {
        return new MovimentacaoFinanceiraRequest(
                "Dízimo", valor == null ? null : new BigDecimal(valor), LocalDate.of(2026, 10, 5),
                TipoMovimentacao.RECEITA, categoriaId, null);
    }

    private static Set<String> mensagens(MovimentacaoFinanceiraRequest requisicao) {
        return validator.validate(requisicao).stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.toSet());
    }
}
