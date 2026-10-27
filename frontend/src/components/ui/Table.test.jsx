// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../test-utils/componentes';
import { Table } from './Table';

const COLUNAS = [
  { chave: 'nome', rotulo: 'Nome', principal: true, renderizar: (item) => item.nome },
  { chave: 'email', rotulo: 'E-mail', renderizar: (item) => item.email },
  { chave: 'status', rotulo: 'Status', destaque: true, renderizar: (item) => item.status },
];
const ITENS = [
  { id: '1', nome: 'Ana', email: 'ana@igreja.org', status: 'ATIVO' },
  { id: '2', nome: 'Bruno', email: 'bruno@igreja.org', status: 'VISITANTE' },
];

describe('<Table>', () => {
  it('usa a coluna principal como cabeçalho de cada linha', () => {
    render(<Table legenda="Pessoas" colunas={COLUNAS} itens={ITENS} />);
    const tabela = screen.getByRole('table', { name: 'Pessoas' });
    expect(within(tabela).getAllByRole('rowheader').map((celula) => celula.textContent)).toEqual(['Ana', 'Bruno']);
    expect(within(tabela).getAllByRole('columnheader').map((celula) => celula.textContent)).toEqual([
      'Nome',
      'E-mail',
      'Status',
    ]);
  });

  it('a coluna de ações só existe quando há ações', () => {
    const { rerender } = render(<Table legenda="Pessoas" colunas={COLUNAS} itens={ITENS} />);
    expect(screen.queryByRole('button')).toBeNull();

    rerender(<Table legenda="Pessoas" colunas={COLUNAS} itens={ITENS} acoes={(item) => <button type="button">Editar {item.nome}</button>} />);
    const tabela = screen.getByRole('table', { name: 'Pessoas' });
    expect(within(tabela).getAllByRole('columnheader')).toHaveLength(4);
    // Uma vez na tabela e outra no cartão (a alternância entre os dois é só por CSS).
    expect(screen.getAllByRole('button', { name: 'Editar Ana' })).toHaveLength(2);
  });

  it('também gera a lista de cartões para telas pequenas', () => {
    render(<Table legenda="Pessoas" colunas={COLUNAS} itens={ITENS} />);
    const cartoes = screen.getByRole('list', { name: 'Pessoas' });
    expect(within(cartoes).getAllByRole('listitem')).toHaveLength(2);
  });
});
