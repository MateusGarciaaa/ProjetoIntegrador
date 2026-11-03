import { Link } from 'react-router-dom';
import { rotuloPerfil } from '../constants/perfis';
import { ROTAS } from '../constants/rotas';
import { Wordmark } from '../components/brand/Wordmark';
import { Button, IconButton } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import styles from './AppHeader.module.css';

function iniciais(texto) {
  const base = texto.split('@')[0];
  const partes = base.split(/[\s._-]+/).filter(Boolean);
  const letras = partes.length > 1 ? partes[0][0] + partes[partes.length - 1][0] : base.slice(0, 2);
  return letras.toUpperCase();
}

export function AppHeader({ menuAberto, onAbrirMenu }) {
  const { usuario, sair } = useAuth();
  // Nome do GET /me (atualizado ao abrir o app) ou da claim "nome"; o e-mail só se nenhum vier.
  const exibicao = usuario.nome ?? usuario.email;

  return (
    <header className={styles.cabecalho}>
      <IconButton
        icone="menu"
        rotulo="Abrir menu"
        className={styles.botaoMenu}
        aria-expanded={menuAberto}
        aria-controls="menu-lateral"
        onClick={onAbrirMenu}
      />
      <Wordmark className={styles.marcaMovel} />

      <div className={styles.usuario}>
        <Link to={ROTAS.MINHA_CONTA} className={styles.conta} title={usuario.email} aria-label={`Minha conta: ${exibicao}`}>
          <span className={styles.avatar} aria-hidden="true">
            {iniciais(exibicao)}
          </span>
          <span className={styles.identificacao}>
            <span className={styles.nome}>{exibicao}</span>
            <span className={styles.perfil}>{rotuloPerfil(usuario.perfil)}</span>
          </span>
        </Link>
        <span className={styles.divisor} aria-hidden="true" />
        <Button variante="fantasma" pequeno icone="sair" onClick={sair}>
          <span className={styles.textoSair}>Sair</span>
        </Button>
      </div>
    </header>
  );
}
