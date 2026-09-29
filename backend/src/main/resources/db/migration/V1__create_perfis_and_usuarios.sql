CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE perfis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    perfil_id UUID NOT NULL REFERENCES perfis(id)
);

CREATE INDEX idx_usuarios_email ON usuarios(email);

INSERT INTO perfis (nome) VALUES ('ADMINISTRADOR'), ('PASTOR'), ('SECRETARIO'), ('TESOUREIRO'), ('MEMBRO');