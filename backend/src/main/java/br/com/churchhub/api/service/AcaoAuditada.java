package br.com.churchhub.api.service;

/** Alterações críticas registradas no log de auditoria (RN13). */
public enum AcaoAuditada {
    USUARIO_CADASTRADO,
    PERFIL_ALTERADO,
    USUARIO_ATIVADO,
    USUARIO_DESATIVADO,
    CONVITE_REENVIADO,
    SENHA_ALTERADA
}
