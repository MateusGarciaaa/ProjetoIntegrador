import { NavLink } from 'react-router-dom';
import { ROTAS } from '../../constants/rotas';
import { parametrosDoPeriodo } from '../../schemas/consultaFinanceiro';
import { cx } from '../../utils/classNames';
import { Icon } from '../ui/Icon';
import styles from './AbasFinanceiro.module.css';

const ABAS = [
  { caminho: ROTAS.FINANCEIRO, rotulo: 'Movimentações', icone: 'menu' },
  { caminho: ROTAS.FLUXO_DE_CAIXA, rotulo: 'Fluxo de caixa', icone: 'grafico' },
  { caminho: ROTAS.RELATORIO_FINANCEIRO, rotulo: 'Relatório', icone: 'relatorio' },
];

/** Navegação entre as três telas do Financeiro; o período escolhido acompanha a troca de aba. */
export function AbasFinanceiro({ consulta, hoje }) {
  const busca = new URLSearchParams(parametrosDoPeriodo(consulta, { hoje })).toString();
  return (
    <nav className={styles.abas} aria-label="Telas do financeiro">
      {ABAS.map((aba) => (
        <NavLink
          key={aba.caminho}
          end
          to={{ pathname: aba.caminho, search: busca ? `?${busca}` : '' }}
          className={({ isActive }) => cx(styles.aba, isActive && styles.ativa)}
        >
          <Icon nome={aba.icone} tamanho={16} />
          {aba.rotulo}
        </NavLink>
      ))}
    </nav>
  );
}
