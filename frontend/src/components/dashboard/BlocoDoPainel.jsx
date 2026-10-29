import { useId } from 'react';
import { Link } from 'react-router-dom';
import { cx } from '../../utils/classNames';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { LimiteDeErro } from '../ui/LimiteDeErro';
import { Skeleton } from '../ui/Skeleton';
import styles from './BlocoDoPainel.module.css';

/** Componente próprio: o que `renderizar` lança acontece dentro do LimiteDeErro, não no bloco. */
function ConteudoDoBloco({ renderizar }) {
  return renderizar();
}

function FalhaDoBloco({ titulo, mensagem, onTentar }) {
  return (
    <div className={styles.falha} role="alert">
      <p className={styles.falhaTitulo}>
        <Icon nome="alerta" tamanho={18} />
        Não foi possível carregar {titulo.toLowerCase()}.
      </p>
      {mensagem && <p className={styles.falhaMensagem}>{mensagem}</p>}
      <Button variante="secundario" pequeno onClick={onTentar}>
        Tentar novamente
      </Button>
    </div>
  );
}

/**
 * Um bloco do Painel com estado próprio: carregando (Skeleton), erro (mensagem e "Tentar novamente"
 * só deste bloco) ou o conteúdo. Erros de renderização também ficam presos aqui (LimiteDeErro), então
 * um bloco quebrado nunca derruba os outros. Por isso o conteúdo é uma função (`children()`), chamada só
 * com os dados prontos e já dentro do limite de erro.
 *   estado: { carregando, erro, recarregar } do hook do bloco; pronto: os dados chegaram.
 *   link: { para, rotulo } — atalho para a tela correspondente (os blocos levam a ela em um clique).
 */
export function BlocoDoPainel({ titulo, link, estado, pronto, alturaCarregando = '8rem', largo = false, children }) {
  const idTitulo = useId();
  const { erro, recarregar } = estado;

  function conteudo() {
    if (erro) return <FalhaDoBloco titulo={titulo} mensagem={erro.message} onTentar={recarregar} />;
    if (!pronto) {
      return (
        <div role="status">
          <span className="sr-only">Carregando {titulo.toLowerCase()}…</span>
          <Skeleton altura={alturaCarregando} />
        </div>
      );
    }
    return (
      <LimiteDeErro aoTentarDeNovo={recarregar} alternativa={(tentar) => <FalhaDoBloco titulo={titulo} onTentar={tentar} />}>
        <ConteudoDoBloco renderizar={children} />
      </LimiteDeErro>
    );
  }

  return (
    <section className={cx(styles.bloco, largo && styles.largo)} aria-labelledby={idTitulo} aria-busy={!pronto && !erro}>
      <header className={styles.cabecalho}>
        <h2 id={idTitulo} className={styles.titulo}>
          {titulo}
        </h2>
        {link && (
          <Link className={styles.link} to={link.para}>
            {link.rotulo}
            <Icon nome="proxima" tamanho={16} />
          </Link>
        )}
      </header>
      {conteudo()}
    </section>
  );
}
