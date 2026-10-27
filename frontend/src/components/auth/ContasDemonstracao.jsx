import { rotuloPerfil } from '../../constants/perfis';
import styles from './ContasDemonstracao.module.css';

const AVISOS = Object.freeze({
  simulado: 'Os dados ficam só neste navegador e voltam ao início quando a página é recarregada.',
  servidor: 'Ambiente de apresentação com dados fictícios, compartilhado por todos os visitantes.',
});

/** Só aparece em ambiente de apresentação: preenche o formulário com uma conta de teste. */
export function ContasDemonstracao({ contas, simulado, desabilitado, onEscolher }) {
  return (
    <section className={styles.bloco} aria-labelledby="titulo-demonstracao">
      <h2 id="titulo-demonstracao" className={styles.titulo}>
        Modo demonstração
      </h2>
      <p className={styles.texto}>
        {simulado ? AVISOS.simulado : AVISOS.servidor} Escolha um perfil para preencher o acesso.
      </p>
      <ul className={styles.contas}>
        {contas.map((conta) => (
          <li key={conta.email}>
            <button type="button" className={styles.conta} disabled={desabilitado} onClick={() => onEscolher(conta)}>
              <span className={styles.perfil}>{rotuloPerfil(conta.perfil)}</span>
              <span className={styles.email}>{conta.email}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
