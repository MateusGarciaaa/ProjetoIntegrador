-- src/main/resources/db/migration/V4__create_eventos.sql
CREATE TABLE eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(150) NOT NULL,
    descricao VARCHAR(1000),
    data DATE NOT NULL,
    horario TIME NOT NULL,
    local VARCHAR(255)
);

CREATE INDEX idx_eventos_data ON eventos (data);