package br.com.churchhub.api.exception;

import org.springframework.security.core.AuthenticationException;

/**
 * 401 com motivo: o token era autêntico, mas a senha ou o perfil do usuário mudaram depois
 * da emissão. A mensagem explica ao usuário por que precisa entrar de novo.
 */
public class SessaoEncerradaException extends AuthenticationException {

    public SessaoEncerradaException(String motivo) {
        super(motivo);
    }
}
