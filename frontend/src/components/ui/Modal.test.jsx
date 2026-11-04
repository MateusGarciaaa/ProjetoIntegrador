// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import '../../test-utils/componentes';
import { simularElementosVisiveis } from '../../test-utils/layout';
import { Button } from './Button';
import { Modal } from './Modal';

simularElementosVisiveis();

function Tela() {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Button onClick={() => setAberto(true)}>Abrir janela</Button>
      <Modal
        aberto={aberto}
        titulo="Confirmar"
        onFechar={() => setAberto(false)}
        rodape={
          <>
            <Button variante="secundario" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button>Confirmar</Button>
          </>
        }
      >
        <p>Conteúdo</p>
      </Modal>
    </>
  );
}

function abrirJanela() {
  render(<Tela />);
  const abrir = screen.getByRole('button', { name: 'Abrir janela' });
  abrir.focus();
  fireEvent.click(abrir);
  return { abrir, dialogo: screen.getByRole('dialog', { name: 'Confirmar' }) };
}

const tab = (shiftKey = false) => fireEvent.keyDown(document.activeElement, { key: 'Tab', shiftKey });

describe('Modal pelo teclado', () => {
  it('ao abrir, o foco entra na janela', () => {
    const { dialogo } = abrirJanela();
    expect(dialogo.contains(document.activeElement)).toBe(true);
  });

  it('Tab no último controle volta ao primeiro, e Shift+Tab no primeiro vai ao último', () => {
    abrirJanela();
    const fechar = screen.getByRole('button', { name: 'Fechar' });
    const confirmar = screen.getByRole('button', { name: 'Confirmar' });

    confirmar.focus();
    tab();
    expect(document.activeElement).toBe(fechar);

    tab(true);
    expect(document.activeElement).toBe(confirmar);
  });

  it('Esc fecha e o foco volta para o botão que abriu', () => {
    const { abrir, dialogo } = abrirJanela();
    fireEvent.keyDown(dialogo, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(abrir);
  });

  it('fechar pelo botão também devolve o foco', () => {
    const { abrir } = abrirJanela();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(abrir);
  });
});
