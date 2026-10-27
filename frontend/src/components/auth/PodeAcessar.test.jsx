// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PERFIS } from '../../constants/perfis';
import { PERMISSOES } from '../../constants/permissoes';
import { renderizarComPerfil } from '../../test-utils/componentes';
import { PodeAcessar } from './PodeAcessar';

function botaoExcluir() {
  return (
    <PodeAcessar permissao={PERMISSOES.MEMBROS_EXCLUIR} senao={<span>Sem permissão</span>}>
      <button type="button">Excluir</button>
    </PodeAcessar>
  );
}

describe('<PodeAcessar>', () => {
  it('mostra o conteúdo para quem tem a permissão', () => {
    renderizarComPerfil(botaoExcluir(), PERFIS.ADMINISTRADOR);
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeTruthy();
    expect(screen.queryByText('Sem permissão')).toBeNull();
  });

  it('mostra a alternativa para quem não tem', () => {
    renderizarComPerfil(botaoExcluir(), PERFIS.SECRETARIO);
    expect(screen.queryByRole('button', { name: 'Excluir' })).toBeNull();
    expect(screen.getByText('Sem permissão')).toBeTruthy();
  });

  it('sem alternativa e sem usuário, não renderiza nada', () => {
    const { container } = renderizarComPerfil(
      <PodeAcessar permissao={PERMISSOES.EVENTOS_VISUALIZAR}>
        <span>Eventos</span>
      </PodeAcessar>,
      null,
    );
    expect(container.innerHTML).toBe('');
  });
});
