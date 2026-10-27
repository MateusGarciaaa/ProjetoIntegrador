import { Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Wordmark } from '../components/brand/Wordmark';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { IconButton } from '../components/ui/Button';
import { CarregandoPagina } from '../components/ui/CarregandoPagina';
import { Icon } from '../components/ui/Icon';
import { itensMenuDoPerfil, trilhaDoCaminho } from '../constants/navegacao';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { usePermissao } from '../hooks/usePermissao';
import { cx } from '../utils/classNames';
import { AppHeader } from './AppHeader';
import styles from './AppLayout.module.css';

const MEDIA_DESKTOP = '(min-width: 960px)';

/**
 * Estrutura das telas autenticadas. No celular, o menu vira um painel lateral.
 * O menu só lista as áreas que o perfil pode ver; as páginas carregam sob demanda.
 */
export function AppLayout() {
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef(null);
  const { pathname } = useLocation();
  const { perfil } = usePermissao();
  useFocusTrap(menuRef, menuAberto);

  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  useEffect(() => {
    const consulta = window.matchMedia(MEDIA_DESKTOP);
    const fecharNoDesktop = (evento) => evento.matches && setMenuAberto(false);
    consulta.addEventListener('change', fecharNoDesktop);
    return () => consulta.removeEventListener('change', fecharNoDesktop);
  }, []);

  function aoPressionarTecla(evento) {
    if (evento.key === 'Escape' && menuAberto) setMenuAberto(false);
  }

  return (
    <div className={styles.estrutura}>
      <a className={styles.pularLink} href="#conteudo-principal">
        Pular para o conteúdo
      </a>

      {menuAberto && <div className={styles.veu} onClick={() => setMenuAberto(false)} aria-hidden="true" />}

      <aside
        id="menu-lateral"
        ref={menuRef}
        className={cx(styles.menu, menuAberto && styles.menuAberto)}
        aria-label="Menu principal"
        onKeyDown={aoPressionarTecla}
      >
        <div className={styles.menuTopo}>
          <Wordmark />
          <IconButton
            icone="fechar"
            rotulo="Fechar menu"
            pequeno
            className={styles.botaoFecharMenu}
            onClick={() => setMenuAberto(false)}
          />
        </div>
        <nav aria-label="Seções">
          <ul className={styles.itens}>
            {itensMenuDoPerfil(perfil).map((item) => (
              <li key={item.caminho}>
                <NavLink to={item.caminho} className={({ isActive }) => cx(styles.link, isActive && styles.linkAtivo)}>
                  <Icon nome={item.icone} />
                  {item.rotulo}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className={styles.coluna}>
        <AppHeader menuAberto={menuAberto} onAbrirMenu={() => setMenuAberto(true)} />
        <main id="conteudo-principal" tabIndex={-1} className={styles.conteudo}>
          <Breadcrumb itens={trilhaDoCaminho(pathname, perfil)} />
          <Suspense fallback={<CarregandoPagina />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
