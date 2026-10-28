import { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CargaDoEvento } from '../components/events/CargaDoEvento';
import { EventoEditor } from '../components/events/EventoEditor';
import { Alert } from '../components/ui/Alert';
import { ButtonLink } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { caminhoDoEvento, ROTAS } from '../constants/rotas';
import { useEvento } from '../hooks/useEvento';
import { usePermissao } from '../hooks/usePermissao';
import { useTituloPagina } from '../hooks/useTituloPagina';
import { useToast } from '../hooks/useToast';
import { useVoltarParaLista } from '../hooks/useVoltarParaLista';
import { agoraDoServidor, situacaoEdicaoEvento } from '../schemas/regrasEvento';
import { isDataIsoValida } from '../utils/datas';
import styles from './EventoPaginas.module.css';

/** Depois de salvar, abre os detalhes no lugar do formulário (o "voltar" não reabre o formulário). */
function useAoSalvar(mensagem) {
  const navigate = useNavigate();
  const toast = useToast();
  const { estado } = useVoltarParaLista(ROTAS.EVENTOS);
  return (salvo) => {
    toast.sucesso(mensagem);
    navigate(caminhoDoEvento(salvo.id), { replace: true, state: estado });
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

function CadastroEvento() {
  const navigate = useNavigate();
  const [parametros] = useSearchParams();
  const { voltarPara } = useVoltarParaLista(ROTAS.EVENTOS);
  const aoSalvar = useAoSalvar('Evento cadastrado.');
  // ?data=AAAA-MM-DD vem do "+" de um dia do calendário; valor inválido é ignorado.
  const dataSugerida = isDataIsoValida(parametros.get('data')) ? parametros.get('data') : null;

  return (
    <Moldura
      titulo="Novo evento"
      descricao="Preencha os dados para incluir o evento na agenda."
      voltarPara={voltarPara}
      rotuloVoltar="Voltar para os eventos"
    >
      <Card>
        <EventoEditor evento={null} dataSugerida={dataSugerida} onSalvo={aoSalvar} onCancelar={() => navigate(voltarPara)} />
      </Card>
    </Moldura>
  );
}

function EdicaoEvento({ id }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { perfil } = usePermissao();
  const { voltarPara, estado } = useVoltarParaLista(ROTAS.EVENTOS);
  const { evento, erro, naoEncontrado, recarregar } = useEvento(id);
  const aoSalvar = useAoSalvar('Alterações salvas.');
  const detalhes = caminhoDoEvento(id);
  // RN09 decidida ao carregar: se o evento encerrar com o formulário aberto, o que foi digitado
  // não some — o backend recusa o envio (409) e a mensagem aparece no topo do formulário.
  const edicao = useMemo(() => (evento ? situacaoEdicaoEvento(perfil, evento, agoraDoServidor()) : null), [perfil, evento]);

  function aoEventoRemovido() {
    toast.aviso('Este evento não está mais na agenda.');
    navigate(voltarPara, { replace: true });
  }

  function conteudo() {
    if (!evento) {
      return <CargaDoEvento erro={erro} naoEncontrado={naoEncontrado} recarregar={recarregar} voltarPara={voltarPara} />;
    }
    // Aberto pela URL, o formulário de um evento encerrado nem aparece para quem não é administrador.
    const { permitido, motivo } = edicao;
    if (!permitido) {
      return (
        <Alert tom="aviso">
          {motivo}{' '}
          <ButtonLink variante="fantasma" pequeno to={detalhes} state={estado}>
            Ver detalhes
          </ButtonLink>
        </Alert>
      );
    }
    return (
      <Card>
        <EventoEditor
          key={evento.id}
          evento={evento}
          onSalvo={aoSalvar}
          onCancelar={() => navigate(detalhes, { state: estado })}
          onEventoRemovido={aoEventoRemovido}
        />
      </Card>
    );
  }

  return (
    <Moldura titulo="Editar evento" descricao={evento?.titulo} voltarPara={detalhes} estado={estado} rotuloVoltar="Voltar para os detalhes">
      {conteudo()}
    </Moldura>
  );
}

/** Uma só página para /eventos/novo e /eventos/:id/editar; o formulário é o mesmo. */
export function EventoFormPage() {
  const { id } = useParams();
  return id ? <EdicaoEvento id={id} /> : <CadastroEvento />;
}
