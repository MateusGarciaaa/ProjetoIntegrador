package br.com.churchhub.api.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Senha com no máximo 72 bytes em UTF-8 (ver {@link SenhaBcrypt}). Usar em todo DTO que recebe senha. */
@Documented
@Constraint(validatedBy = CabeNoBcryptValidator.class)
@Target({ElementType.FIELD, ElementType.RECORD_COMPONENT, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface CabeNoBcrypt {

    String message() default "A senha é longa demais: o limite é de 72 bytes "
            + "(letras acentuadas e símbolos ocupam 2 ou mais)";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
