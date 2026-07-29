CREATE TABLE membros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(150) NOT NULL,
    cpf VARCHAR(11) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    telefone VARCHAR(20),
    endereco VARCHAR(255),
    data_nascimento DATE,
    data_batismo DATE,
    data_conversao DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVO'
);

CREATE INDEX idx_membros_nome ON membros (nome);