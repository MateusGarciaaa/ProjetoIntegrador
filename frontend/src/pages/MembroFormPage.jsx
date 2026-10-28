import { useNavigate, useParams } from 'react-router-dom';
import { CargaDoMembro } from '../components/members/CargaDoMembro';
import { MembroEditor } from '../components/members/MembroEditor';
import { ButtonLink } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { caminhoDoMembro } from '../constants/rotas';
import { useMembro } from '../hooks/useMembro';
import { useTituloPagina } from '../hooks/useTituloPagina';
import { useToast } from '../hooks/useToast';
import { useVoltarParaLista } from '../hooks/useVoltarParaLista';
import styles from './MembroPaginas.module.css';

/** Depois de salvar, abre os detalhes no lugar do formulário (o "voltar" não reabre o formulário). */
function useAoSalvar(mensagem) {
  const navigate = useNavigate();
  const toast = useToast();
  const { estado } = useVoltarParaLista();
  return (salvo) => {
    toast.sucesso(mensagem);
    navigate(caminhoDoMembro(salvo.id), { replace: true, state: estado });
  };
}

function Moldura({ titulo, descricao, voltarPara, estado, rotuloVoltar, children }) {
  useTituloPagina(titulo);
  return (
    <>
      <ButtonLink variante="fantasma" pequeno icone="voltar" to={voltarPara} state={estado} className={styles.voltar}>
        {rotuloVoltar}
      </ButtonLink>
      <PageHeader titulo={titulo} descricao={descricao} />
      {children}
    </>
  );
}

function CadastroMembro() {
  const navigate = useNavigate();
  const { voltarPara } = useVoltarParaLista();
  const aoSalvar = useAoSalvar('Membro cadastrado.');

  return (
    <Moldura
      titulo="Novo membro"
      descricao="Preencha os dados para incluir a pessoa no cadastro."
      voltarPara={voltarPara}
      rotuloVoltar="Voltar para a lista"
    >
      <Card>
        <MembroEditor membro={null} onSalvo={aoSalvar} onCancelar={() => navigate(voltarPara)} />
      </Card>
    </Moldura>
  );
}

function EdicaoMembro({ id }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { voltarPara, estado } = useVoltarParaLista();
  const { membro, erro, naoEncontrado, recarregar } = useMembro(id);
  const aoSalvar = useAoSalvar('Alterações salvas.');
  const detalhes = caminhoDoMembro(id);

  function aoMembroRemovido() {
    toast.aviso('Este membro não está mais no cadastro.');
    navigate(voltarPara, { replace: true });
  }

  return (
    <Moldura
      titulo="Editar membro"
      descricao={membro?.nome}
      voltarPara={detalhes}
      estado={estado}
      rotuloVoltar="Voltar para os detalhes"
    >
      {membro ? (
        <Card>
          <MembroEditor
            key={membro.id}
            membro={membro}
            onSalvo={aoSalvar}
            onCancelar={() => navigate(detalhes, { state: estado })}
            onMembroRemovido={aoMembroRemovido}
          />
        </Card>
      ) : (
        <CargaDoMembro erro={erro} naoEncontrado={naoEncontrado} recarregar={recarregar} voltarPara={voltarPara} />
      )}
    </Moldura>
  );
}

/** Uma só página para /membros/novo e /membros/:id/editar; o formulário é o mesmo. */
export function MembroFormPage() {
  const { id } = useParams();
  return id ? <EdicaoMembro id={id} /> : <CadastroMembro />;
}
