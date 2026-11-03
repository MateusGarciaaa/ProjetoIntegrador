package br.com.churchhub.api.security;

/**
 * Resultado da conferência de um JWT bem assinado e dentro do prazo contra o usuário atual do banco.
 * Os casos com {@link #getMotivo() motivo} viram 401 com uma mensagem específica, para o frontend
 * explicar por que a sessão terminou; os demais recebem a mensagem genérica de sessão expirada.
 */
public enum SituacaoToken {

    VALIDO(null),
    /** Assinatura, prazo ou e-mail não conferem, ou o usuário foi desativado. */
    INVALIDO(null),
    /** O token foi emitido antes da última definição de senha (troca, redefinição). */
    SENHA_ALTERADA("Sua senha foi alterada. Entre novamente."),
    /** A claim {@code perfil} difere do perfil atual do usuário: o menu e as rotas do front estariam errados. */
    PERFIL_ALTERADO("Seu acesso foi alterado. Entre novamente.");

    private final String motivo;

    SituacaoToken(String motivo) {
        this.motivo = motivo;
    }

    public String getMotivo() {
        return motivo;
    }
}
