import { useCallback, useEffect, useState } from 'react';
import { CaixaEmailSimulada } from '../components/auth/CaixaEmailSimulada';
import { AlterarSituacaoDialog } from '../components/usuarios/AlterarSituacaoDialog';
import { UsuariosFiltros } from '../components/usuarios/UsuariosFiltros';
import { UsuariosLista } from '../components/usuarios/UsuariosLista';
import { Button, ButtonLink } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { CarregandoPagina } from '../components/ui/CarregandoPagina';
import { appConfig } from '../config/env';
import { ROTAS } from '../constants/rotas';
import { useAuth } from '../hooks/useAuth';
import { useConsultaUsuariosUrl } from '../hooks/useConsultaUsuariosUrl';
import { useTituloPagina } from '../hooks/useTituloPagina';
import { useToast } from '../hooks/useToast';
import { useUsuarios } from '../hooks/useUsuarios';
import { temFiltroUsuarios } from '../schemas/consultaUsuarios';
import { usuariosService } from '../services/usuarios/usuariosService';
import { cx } from '../utils/classNames';
import styles from './UsuariosPage.module.css';

function Resultado({ pagina, erro, carregando, consulta, onRecarregar, onLimpar, onMudarPagina, lista }) {
  if (erro) {
    return (
      <EmptyState
        icone="alerta"
        papel="alert"
        titulo="Não foi possível carregar os usuários"
        descricao={erro.message}
        acao={
          <Button variante="secundario" onClick={onRecarregar}>
            Tentar novamente
          </Button>
        }
      />
    );
  }
  if (!pagina) return <CarregandoPagina />;
  if (pagina.totalElements === 0 && temFiltroUsuarios(consulta)) {
    return (
      <EmptyState
        icone="busca"
        titulo="Nenhum usuário encontrado"
        descricao="Nenhum usuário com esses filtros. Confira a grafia ou mude os filtros."
        acao={
          <Button variante="secundario" onClick={onLimpar}>
            Limpar filtros
          </Button>
        }
      />
    );
  }
  return (
    <div aria-busy={carregando} className={cx(carregando && styles.atualizando)}>
      <UsuariosLista usuarios={pagina.content} {...lista} />
      <Pagination pagina={pagina} onMudarPagina={onMudarPagina} desabilitado={carregando} />
    </div>
  );
}

/** Gestão de usuários (RN02), só para o Administrador: lista, cadastro, edição, ativação e convite. */
export function UsuariosPage() {
  useTituloPagina('Usuários');
  const toast = useToast();
  const { usuario: logado } = useAuth();
  const { consulta, buscar, filtrarPerfil, filtrarSituacao, mudarPagina, corrigirPagina, limpar } = useConsultaUsuariosUrl();
  const { pagina, erro, carregando, recarregar } = useUsuarios(consulta);
  const [usuarioDoDialogo, setUsuarioDoDialogo] = useState(null);
  const [conviteEmEnvio, setConviteEmEnvio] = useState(null);

  // Página que ficou vazia (filtro mudou o total, ou ?pagina= alto demais): vai para a última que existe.
  useEffect(() => {
    if (pagina && pagina.content.length === 0 && pagina.number > 0) {
      corrigirPagina(Math.max(0, pagina.totalPages - 1));
    }
  }, [pagina, corrigirPagina]);

  const fecharDialogo = useCallback(() => setUsuarioDoDialogo(null), []);

  function aoAlterarSituacao(atualizado) {
    toast.sucesso(atualizado.ativo ? `${atualizado.nome} foi ativado.` : `${atualizado.nome} foi desativado.`);
    fecharDialogo();
    recarregar();
  }

  function aoUsuarioRemovido() {
    toast.aviso('Este usuário não está mais no cadastro. A lista foi atualizada.');
    fecharDialogo();
    recarregar();
  }

  async function reenviarConvite(usuario) {
    if (conviteEmEnvio) return;
    setConviteEmEnvio(usuario.id);
    try {
      await usuariosService.reenviarConvite(usuario.id);
      toast.sucesso(`Convite reenviado para ${usuario.email}. O link anterior deixou de valer.`);
    } catch (falha) {
      if (!falha.isFimDeSessao?.()) {
        toast.erro(falha.message);
        recarregar();
      }
    } finally {
      setConviteEmEnvio(null);
    }
  }

  return (
    <>
      <PageHeader titulo="Usuários" descricao="Quem acessa o sistema, com que perfil, e quem ainda não aceitou o convite." />

      <div className={styles.barra}>
        <UsuariosFiltros
          consulta={consulta}
          onBuscar={buscar}
          onFiltrarPerfil={filtrarPerfil}
          onFiltrarSituacao={filtrarSituacao}
        />
        <ButtonLink icone="mais" to={ROTAS.USUARIO_NOVO} className={styles.novo}>
          Novo usuário
        </ButtonLink>
      </div>

      <section className={styles.painel} aria-label="Lista de usuários">
        <Resultado
          pagina={pagina}
          erro={erro}
          carregando={carregando}
          consulta={consulta}
          onRecarregar={recarregar}
          onLimpar={limpar}
          onMudarPagina={mudarPagina}
          lista={{
            emailLogado: logado?.email,
            conviteEmEnvio,
            onAlterarSituacao: setUsuarioDoDialogo,
            onReenviarConvite: reenviarConvite,
          }}
        />
      </section>

      {/* Só no modo demonstração: o link do convite que o backend "enviaria" por e-mail. */}
      {appConfig.useMockApi && (
        <div className={styles.caixa}>
          <CaixaEmailSimulada />
        </div>
      )}

      {usuarioDoDialogo && (
        <AlterarSituacaoDialog
          usuario={usuarioDoDialogo}
          onFechar={fecharDialogo}
          onConcluido={aoAlterarSituacao}
          onUsuarioRemovido={aoUsuarioRemovido}
        />
      )}
    </>
  );
}
