CREATE TABLE movimentacoes_financeiras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descricao VARCHAR(255) NOT NULL,
    valor NUMERIC(12,2) NOT NULL,
    data DATE NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    categoria_id UUID NOT NULL REFERENCES categorias_financeiras(id),
    membro_id UUID REFERENCES membros(id),
    CONSTRAINT chk_valor_positivo CHECK (valor > 0)
);

CREATE INDEX idx_movimentacoes_data ON movimentacoes_financeiras (data);
CREATE INDEX idx_movimentacoes_categoria ON movimentacoes_financeiras (categoria_id);
CREATE INDEX idx_movimentacoes_membro ON movimentacoes_financeiras (membro_id);