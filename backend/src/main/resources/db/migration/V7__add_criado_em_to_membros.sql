-- Data e hora do cadastro do membro (história "novos membros" do Pastor), no fuso da igreja
-- (APP_TIMEZONE), preenchida pela auditoria do JPA a partir do Clock da aplicação.
-- Sem backfill: os membros já existentes ficam com NULL ("cadastrado antes do sistema registrar
-- a data"), para não aparecerem todos como novos.
ALTER TABLE membros ADD COLUMN criado_em TIMESTAMP;

CREATE INDEX idx_membros_criado_em ON membros (criado_em);
