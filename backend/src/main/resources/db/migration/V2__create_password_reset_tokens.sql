CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(255) NOT NULL UNIQUE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    expira_em TIMESTAMP NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);