import { formatarCpf } from '../../utils/cpf';
import { formatarData } from '../../utils/datas';
import { exibirTelefone } from '../../utils/telefone';
import { Card } from '../ui/Card';
import { MembroStatusBadge } from './MembroStatusBadge';
import styles from './MembroDetalhes.module.css';

function Dado({ rotulo, children }) {
  return (
    <div className={styles.dado}>
      <dt className={styles.rotulo}>{rotulo}</dt>
      <dd className={styles.valor}>{children || <span className={styles.vazio}>Não informado</span>}</dd>
    </div>
  );
}

/** Todos os campos do MembroResponse, agrupados como no formulário. */
export function MembroDetalhes({ membro }) {
  return (
    <div className={styles.grupos}>
      <Card titulo="Identificação">
        <dl className={styles.lista}>
          <Dado rotulo="Nome completo">{membro.nome}</Dado>
          <Dado rotulo="CPF">{formatarCpf(membro.cpf ?? '')}</Dado>
          <Dado rotulo="Status">
            <MembroStatusBadge status={membro.status} />
          </Dado>
        </dl>
      </Card>

      <Card titulo="Contato">
        <dl className={styles.lista}>
          <Dado rotulo="E-mail">{membro.email && <a href={`mailto:${membro.email}`}>{membro.email}</a>}</Dado>
          <Dado rotulo="Telefone">{exibirTelefone(membro.telefone)}</Dado>
          <Dado rotulo="Endereço">{membro.endereco}</Dado>
        </dl>
      </Card>

      <Card titulo="Datas">
        <dl className={styles.lista}>
          <Dado rotulo="Nascimento">{formatarData(membro.dataNascimento)}</Dado>
          <Dado rotulo="Conversão">{formatarData(membro.dataConversao)}</Dado>
          <Dado rotulo="Batismo">{formatarData(membro.dataBatismo)}</Dado>
        </dl>
      </Card>
    </div>
  );
}
