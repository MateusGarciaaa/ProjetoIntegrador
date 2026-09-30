import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { cx } from '../../utils/classNames';
import { IconButton } from './Button';
import styles from './Modal.module.css';

/**
 * Janela modal acessível: foco preso dentro dela, Esc fecha e o foco volta
 * para quem abriu. Com podeFechar=false (ex.: salvando), Esc e o X ficam inativos.
 */
export function Modal({ aberto, titulo, descricao, onFechar, podeFechar = true, tamanho = 'medio', rodape, children }) {
  const painelRef = useRef(null);
  const idTitulo = useId();
  const idDescricao = useId();
  useFocusTrap(painelRef, aberto);

  if (!aberto) return null;

  function aoPressionarTecla(evento) {
    if (evento.key === 'Escape' && podeFechar) {
      evento.stopPropagation();
      onFechar();
    }
  }

  return createPortal(
    <div className={styles.fundo}>
      <div
        ref={painelRef}
        className={cx(styles.painel, styles[tamanho])}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={descricao ? idDescricao : undefined}
        tabIndex={-1}
        onKeyDown={aoPressionarTecla}
      >
        <header className={styles.cabecalho}>
          <div>
            <h2 id={idTitulo} className={styles.titulo}>
              {titulo}
            </h2>
            {descricao && (
              <p id={idDescricao} className={styles.descricao}>
                {descricao}
              </p>
            )}
          </div>
          <IconButton icone="fechar" rotulo="Fechar" onClick={onFechar} disabled={!podeFechar} />
        </header>
        <div className={styles.corpo}>{children}</div>
        {rodape && <footer className={styles.rodape}>{rodape}</footer>}
      </div>
    </div>,
    document.body,
  );
}
