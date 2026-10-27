package br.com.churchhub.api.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class CabeNoBcryptValidator implements ConstraintValidator<CabeNoBcrypt, String> {

    @Override
    public boolean isValid(String senha, ConstraintValidatorContext context) {
        return SenhaBcrypt.cabe(senha);
    }
}
