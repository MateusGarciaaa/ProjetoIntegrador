import { VISOES_EVENTOS } from '../../constants/eventos';
import { cx } from '../../utils/classNames';
import { Icon } from '../ui/Icon';
import styles from './AlternarVisao.module.css';

const OPCOES = [
  { valor: VISOES_EVENTOS.CALENDARIO, rotulo: 'Calendário', icone: 'calendario' },
  { valor: VISOES_EVENTOS.LISTA, rotulo: 'Lista', icone: 'menu' },
];

/** Alternância Calendário/Lista: botões com aria-pressed (a escolha vai para a URL). */
export function AlternarVisao({ visao, onMudar }) {
  return (
    <div className={styles.grupo} role="group" aria-label="Visualização dos eventos">
      {OPCOES.map((opcao) => {
        const ativa = visao === opcao.valor;
        return (
          <button
            key={opcao.valor}
            type="button"
            className={cx(styles.opcao, ativa && styles.ativa)}
            aria-pressed={ativa}
            onClick={() => !ativa && onMudar(opcao.valor)}
          >
            <Icon nome={opcao.icone} tamanho={16} />
            {opcao.rotulo}
          </button>
        );
      })}
    </div>
  );
}
