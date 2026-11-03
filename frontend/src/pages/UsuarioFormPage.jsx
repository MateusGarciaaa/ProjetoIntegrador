import { useNavigate, useParams } from 'react-router-dom';
import { UsuarioEditor } from '../components/usuarios/UsuarioEditor';
import { Button, ButtonLink } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { CarregandoPagina } from '../components/ui/CarregandoPagina';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { ROTAS } from '../constants/rotas';
import { useAuth } from '../hooks/useAuth';
import { useTituloPagina } from '../hooks/useTituloPagina';
import { useToast } from '../hooks/useToast';
import { useUsuario } from '../hooks/useUsuarios';
import { useVoltarParaLista } from '../hooks/useVoltarParaLista';
import styles from './UsuariosPage.module.css';

function Moldura({ titulo, descricao, voltarPara, children }) {
  useTituloPagina(titulo);
  return (
    <>
      <ButtonLink variante="fantasma" pequeno icone="voltar" to={voltarPara} className={styles.voltar}>
        Voltar para a lista
      </ButtonLink>
      <PageHeader titulo={titulo} descricao={descricao} />
      {children}
    </>
  );
}

function CargaDoUsuario({ erro, naoEncontrado, recarregar, voltarPara }) {
  if (naoEncontrado) {
    return (
      <EmptyState
        icone="busca"
        titulo="Usuário não encontrado"
        descricao="Este usuário não está no cadastro, ou o endereço está incorreto."
        acao={
          <ButtonLink variante="secundario" to={voltarPara}>
            Voltar para a lista
          </ButtonLink>
        }
      />
    );
  }
  if (erro) {
    return (
      <EmptyState
        icone="alerta"
        papel="alert"
        titulo="Não foi possível carregar o usuário"
        descricao={erro.message}
        acao={
          <Button variante="secundario" onClick={recarregar}>
            Tentar novamente
          </Button>
        }
      />
    );
  }
  return <CarregandoPagina />;
}

function CadastroUsuario() {
  const navigate = useNavigate();
  const toast = useToast();
  const { voltarPara } = useVoltarParaLista(ROTAS.USUARIOS);

  function aoSalvar(salvo) {
    toast.sucesso(`Usuário cadastrado. O convite foi enviado para ${salvo.email}.`);
    navigate(voltarPara, { replace: true });
  }

  return (
    <Moldura titulo="Novo usuário" descricao="Dê acesso ao sistema a uma pessoa da igreja." voltarPara={voltarPara}>
      <Card>
        <UsuarioEditor usuario={null} onSalvo={aoSalvar} onCancelar={() => navigate(voltarPara)} />
      </Card>
    </Moldura>
  );
}

function EdicaoUsuario({ id }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { usuario: logado } = useAuth();
  const { voltarPara } = useVoltarParaLista(ROTAS.USUARIOS);
  const { usuario, erro, naoEncontrado, recarregar } = useUsuario(id);

  function aoSalvar() {
    toast.sucesso('Alterações salvas.');
    navigate(voltarPara, { replace: true });
  }

  function aoUsuarioRemovido() {
    toast.aviso('Este usuário não está mais no cadastro.');
    navigate(voltarPara, { replace: true });
  }

  return (
    <Moldura titulo="Editar usuário" descricao={usuario?.email} voltarPara={voltarPara}>
      {usuario ? (
        <Card>
          <UsuarioEditor
            key={usuario.id}
            usuario={usuario}
            propriaConta={usuario.email === logado?.email}
            onSalvo={aoSalvar}
            onCancelar={() => navigate(voltarPara)}
            onUsuarioRemovido={aoUsuarioRemovido}
          />
        </Card>
      ) : (
        <CargaDoUsuario erro={erro} naoEncontrado={naoEncontrado} recarregar={recarregar} voltarPara={voltarPara} />
      )}
    </Moldura>
  );
}

/** Uma só página para /usuarios/novo e /usuarios/:id/editar; o formulário é o mesmo. */
export function UsuarioFormPage() {
  const { id } = useParams();
  return id ? <EdicaoUsuario id={id} /> : <CadastroUsuario />;
}
