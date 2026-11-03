-- Momento da última definição de senha do usuário: convite aceito, redefinição pelo link ou
-- troca de senha logado. Em TIMESTAMPTZ (instante absoluto) porque é comparado ao iat do JWT,
-- que é um instante em UTC; a aplicação grava o valor já truncado em segundos, a precisão do iat.
--
-- Usos:
--   * NULL = convite pendente: usuário cadastrado pelo administrador que ainda não definiu a senha;
--   * o JwtAuthenticationFilter recusa tokens emitidos antes deste instante (troca de senha
--     encerra as sessões abertas).
--
-- Backfill: todos os usuários existentes foram criados com senha conhecida (carga inicial ou
-- dados de demonstração), então recebem o instante da migration. Efeito colateral aceito: os
-- tokens emitidos antes da migration deixam de valer e cada usuário entra de novo uma vez.
ALTER TABLE usuarios ADD COLUMN senha_alterada_em TIMESTAMPTZ;

UPDATE usuarios SET senha_alterada_em = date_trunc('second', now());
