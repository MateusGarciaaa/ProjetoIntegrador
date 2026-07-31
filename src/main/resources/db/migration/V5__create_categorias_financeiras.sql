CREATE TABLE categorias_financeiras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    CONSTRAINT uk_categoria_nome_tipo UNIQUE (nome, tipo)
);