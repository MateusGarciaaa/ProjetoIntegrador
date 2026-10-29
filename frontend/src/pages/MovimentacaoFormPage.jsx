import { useNavigate, useParams } from 'react-router-dom';
import { CargaDaMovimentacao } from '../components/financial/CargaDaMovimentacao';
import { MovimentacaoEditor } from '../components/financial/MovimentacaoEditor';
import { ButtonLink } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { ROTAS } from '../constants/rotas';
import { useAgora } from '../hooks/useAgora';
import { useMovimentacao } from '../hooks/useMovimentacao';
import { useTituloPagina } from '../hooks/useTituloPagina';
import { useToast } from '../hooks/useToast';
import { useVoltarParaLista } from '../hooks/useVoltarParaLista';
import { formatarData } from '../utils/datas';
import styles from './EventoPaginas.module.css';

/** Sem tela de detalhes: depois de salvar, volta para a lista de onde a pessoa veio (com período e filtros). */
function useAoSalvar(mensagem) {
  const navigate = useNavigate();
  const toast = useToast();
  const { voltarPara } = useVoltarParaLista(ROTAS.FINANCEIRO);
  return () => {
    toast.sucesso(mensagem);
    navigate(voltarPara, { replace: true });
  };
}

function Moldura({ titulo, descricao, voltarPara, children }) {
  useTituloPagina(titulo);
  return (
    <>
      <ButtonLink variante="fantasma" pequeno icone="voltar" to={voltarPara} className={styles.voltar}>
        Voltar para as movimentações
      </ButtonLink>
      <PageHeader titulo={titulo} descricao={descricao} />
      {children}
    </>
  );
}

function CadastroMovimentacao() {
  const navigate = useNavigate();
  const { data: hoje } = useAgora();
  const { voltarPara } = useVoltarParaLista(ROTAS.FINANCEIRO);
  const aoSalvar = useAoSalvar('Movimentação cadastrada.');

  return (
    <Moldura titulo="Nova movimentação" descricao="Registre uma receita ou uma despesa da igreja." voltarPara={voltarPara}>
      <Card>
        <MovimentacaoEditor movimentacao={null} hoje={hoje} onSalva={aoSalvar} onCancelar={() => navigate(voltarPara)} />
      </Card>
    </Moldura>
  );
}

function EdicaoMovimentacao({ id }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: hoje } = useAgora();
  const { voltarPara } = useVoltarParaLista(ROTAS.FINANCEIRO);
  const { movimentacao, erro, naoEncontrado, recarregar } = useMovimentacao(id);
  const aoSalvar = useAoSalvar('Alterações salvas.');

  function aoRemovida() {
    toast.aviso('Esta movimentação não está mais no financeiro.');
    navigate(voltarPara, { replace: true });
  }

  const descricao = movimentacao ? `${movimentacao.descricao} · ${formatarData(movimentacao.data)}` : undefined;
  return (
    <Moldura titulo="Editar movimentação" descricao={descricao} voltarPara={voltarPara}>
      {movimentacao ? (
        <Card>
          <MovimentacaoEditor
            key={movimentacao.id}
            movimentacao={movimentacao}
            hoje={hoje}
            onSalva={aoSalvar}
            onCancelar={() => navigate(voltarPara)}
            onRemovida={aoRemovida}
          />
        </Card>
      ) : (
        <CargaDaMovimentacao erro={erro} naoEncontrado={naoEncontrado} recarregar={recarregar} voltarPara={voltarPara} />
      )}
    </Moldura>
  );
}

/** Uma só página para /financeiro/novo e /financeiro/:id/editar; o formulário é o mesmo. */
export function MovimentacaoFormPage() {
  const { id } = useParams();
  return id ? <EdicaoMovimentacao id={id} /> : <CadastroMovimentacao />;
}
