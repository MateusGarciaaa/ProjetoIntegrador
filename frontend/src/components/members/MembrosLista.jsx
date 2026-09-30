import { exibirTelefone } from '../../utils/telefone';
import { MembroAcoes } from './MembroAcoes';
import { MembroStatusBadge } from './MembroStatusBadge';
import styles from './MembrosLista.module.css';

function Telefone({ valor }) {
  const telefone = exibirTelefone(valor);
  return telefone ? (
    <span className={styles.telefone}>{telefone}</span>
  ) : (
    <span className={styles.semValor}>
      <span aria-hidden="true">—</span>
      <span className="sr-only">Sem telefone</span>
    </span>
  );
}

/**
 * Lista de membros em duas apresentações (tabela e cartões), alternadas só por CSS.
 * A coluna de ações só existe para perfis que podem editar ou excluir.
 */
export function MembrosLista({ membros, podeEditar, podeExcluir, onEditar, onExcluir }) {
  const temAcoes = podeEditar || podeExcluir;
  const acoes = { podeEditar, podeExcluir, onEditar, onExcluir };

  return (
    <>
      <table className={styles.tabela}>
        <caption className="sr-only">Membros cadastrados</caption>
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">E-mail</th>
            <th scope="col">Telefone</th>
            <th scope="col">Status</th>
            {temAcoes && (
              <th scope="col" className={styles.colunaAcoes}>
                <span className="sr-only">Ações</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {membros.map((membro) => (
            <tr key={membro.id}>
              <th scope="row" className={styles.nome}>
                {membro.nome}
              </th>
              <td className={styles.secundario}>{membro.email}</td>
              <td>
                <Telefone valor={membro.telefone} />
              </td>
              <td>
                <MembroStatusBadge status={membro.status} />
              </td>
              {temAcoes && (
                <td className={styles.colunaAcoes}>
                  <div className={styles.acoes}>
                    <MembroAcoes membro={membro} {...acoes} />
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className={styles.cartoes} aria-label="Membros cadastrados">
        {membros.map((membro) => (
          <li key={membro.id} className={styles.cartao}>
            <div className={styles.cartaoTopo}>
              <span className={styles.nome}>{membro.nome}</span>
              <MembroStatusBadge status={membro.status} />
            </div>
            <div className={styles.cartaoDados}>
              <span className={styles.secundario}>{membro.email}</span>
              <Telefone valor={membro.telefone} />
            </div>
            {temAcoes && (
              <div className={styles.cartaoAcoes}>
                <MembroAcoes membro={membro} {...acoes} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
