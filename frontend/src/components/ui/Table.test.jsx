// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

  it('colunas ordenáveis viram botões e informam a ordenação no aria-sort', () => {
    const onOrdenar = vi.fn();
    const colunas = COLUNAS.map((coluna) => ({ ...coluna, ordenavel: coluna.chave !== 'status' }));
    render(
      <Table legenda="Pessoas" colunas={colunas} itens={ITENS} ordenacao={{ campo: 'email', direcao: 'desc' }} onOrdenar={onOrdenar} />,
    );
    const [nome, email, status] = within(screen.getByRole('table', { name: 'Pessoas' })).getAllByRole('columnheader');
    expect(nome.getAttribute('aria-sort')).toBe('none');
    expect(email.getAttribute('aria-sort')).toBe('descending');
    expect(status.hasAttribute('aria-sort')).toBe(false);
    expect(within(status).queryByRole('button')).toBeNull();

    fireEvent.click(within(nome).getByRole('button', { name: 'Nome' }));
    expect(onOrdenar).toHaveBeenCalledWith('nome');
  });

  it('sem onOrdenar, nenhum cabeçalho vira botão', () => {
    render(<Table legenda="Pessoas" colunas={COLUNAS.map((c) => ({ ...c, ordenavel: true }))} itens={ITENS} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('também gera a lista de cartões para telas pequenas', () => {
    render(<Table legenda="Pessoas" colunas={COLUNAS} itens={ITENS} />);
    const cartoes = screen.getByRole('list', { name: 'Pessoas' });
    expect(within(cartoes).getAllByRole('listitem')).toHaveLength(2);
  });
});
