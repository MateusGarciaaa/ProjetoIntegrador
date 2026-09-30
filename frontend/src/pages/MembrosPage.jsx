import { useCallback, useEffect, useState } from 'react';
import { ExcluirMembroDialog } from '../components/members/ExcluirMembroDialog';
import { MembroFormModal } from '../components/members/MembroFormModal';
import { MembrosLista } from '../components/members/MembrosLista';
import { MembrosSkeleton } from '../components/members/MembrosSkeleton';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { SearchField } from '../components/ui/SearchField';
import { ATRASO_BUSCA_MS } from '../constants/membros';
import { PERMISSOES } from '../constants/permissoes';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useMembros } from '../hooks/useMembros';
import { usePermissao } from '../hooks/usePermissao';
import { useTituloPagina } from '../hooks/useTituloPagina';
import { useToast } from '../hooks/useToast';
import { cx } from '../utils/classNames';
import styles from './MembrosPage.module.css';

const DIALOGOS = Object.freeze({ FORMULARIO: 'formulario', EXCLUSAO: 'exclusao' });

export function MembrosPage() {
  useTituloPagina('Membros');
  const toast = useToast();
  const { pode } = usePermissao();
  const podeCriar = pode(PERMISSOES.MEMBROS_CRIAR);
  const podeEditar = pode(PERMISSOES.MEMBROS_EDITAR);
  const podeExcluir = pode(PERMISSOES.MEMBROS_EXCLUIR);

  const [busca, setBusca] = useState('');
  const termo = useDebouncedValue(busca.trim(), ATRASO_BUSCA_MS);
  const [consulta, setConsulta] = useState({ nome: '', pagina: 0 });
  const { pagina, erro, carregando, recarregar } = useMembros(consulta);
  const [dialogo, setDialogo] = useState(null);

  // Nova busca sempre recomeça da primeira página.
  useEffect(() => {
    setConsulta((atual) => (atual.nome === termo ? atual : { nome: termo, pagina: 0 }));
  }, [termo]);

  // Se a página atual ficou vazia (ex.: o último item dela foi excluído), volta para a última que existe.
  useEffect(() => {
    if (pagina && pagina.content.length === 0 && pagina.number > 0) {
      setConsulta((atual) => ({ ...atual, pagina: Math.max(0, pagina.totalPages - 1) }));
    }
  }, [pagina]);

  const fecharDialogo = useCallback(() => setDialogo(null), []);
  const abrirCadastro = () => setDialogo({ tipo: DIALOGOS.FORMULARIO, membro: null });
  const abrirEdicao = useCallback((membro) => setDialogo({ tipo: DIALOGOS.FORMULARIO, membro }), []);
  const abrirExclusao = useCallback((membro) => setDialogo({ tipo: DIALOGOS.EXCLUSAO, membro }), []);

  function mudarPagina(numero) {
    setConsulta((atual) => ({ ...atual, pagina: numero }));
  }

  function limparBusca() {
    setBusca('');
    setConsulta({ nome: '', pagina: 0 });
  }

  function concluir(mensagem) {
    toast.sucesso(mensagem);
    fecharDialogo();
    recarregar();
  }

  function aoMembroRemovido() {
    toast.aviso('Este membro não está mais no cadastro. A lista foi atualizada.');
    fecharDialogo();
    recarregar();
  }

  const botaoNovo = podeCriar && (
    <Button icone="mais" onClick={abrirCadastro} className={styles.novo}>
      Novo membro
    </Button>
  );

  function renderizarConteudo() {
    if (erro) {
      return (
        <EmptyState
          icone="alerta"
          papel="alert"
          titulo="Não foi possível carregar os membros"
          descricao={erro.message}
          acao={
            <Button variante="secundario" onClick={recarregar}>
              Tentar novamente
            </Button>
          }
        />
      );
    }

    if (!pagina) return <MembrosSkeleton />;

    if (pagina.totalElements === 0 && consulta.nome) {
      return (
        <EmptyState
          icone="busca"
          titulo="Nenhum membro encontrado"
          descricao={`Nenhum nome contém “${consulta.nome}”. Confira a grafia ou busque por outra parte do nome.`}
          acao={
            <Button variante="secundario" onClick={limparBusca}>
              Limpar busca
            </Button>
          }
        />
      );
    }

    if (pagina.totalElements === 0) {
      return (
        <EmptyState
          icone="membros"
          titulo="Nenhum membro cadastrado"
          descricao={
            podeCriar
              ? 'Cadastre a primeira pessoa para começar a montar o rol de membros.'
              : 'Quando a secretaria cadastrar alguém, a pessoa aparece aqui.'
          }
          acao={botaoNovo}
        />
      );
    }

    return (
      <div aria-busy={carregando} className={cx(carregando && styles.atualizando)}>
        <MembrosLista
          membros={pagina.content}
          podeEditar={podeEditar}
          podeExcluir={podeExcluir}
          onEditar={abrirEdicao}
          onExcluir={abrirExclusao}
        />
        <Pagination pagina={pagina} onMudarPagina={mudarPagina} desabilitado={carregando} />
      </div>
    );
  }

  return (
    <>
      <PageHeader titulo="Membros" descricao="Rol de membros e visitantes da igreja." />

      <div className={styles.barra}>
        <SearchField
          id="busca-membros"
          rotulo="Buscar membros por nome"
          placeholder="Buscar por nome"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
        />
        {botaoNovo}
      </div>

      <section className={styles.painel} aria-label="Lista de membros">
        {renderizarConteudo()}
      </section>

      {dialogo?.tipo === DIALOGOS.FORMULARIO && (
        <MembroFormModal
          key={dialogo.membro?.id ?? 'novo'}
          membro={dialogo.membro}
          onFechar={fecharDialogo}
          onSalvo={() => concluir(dialogo.membro ? 'Alterações salvas.' : 'Membro cadastrado.')}
          onMembroRemovido={aoMembroRemovido}
        />
      )}

      {dialogo?.tipo === DIALOGOS.EXCLUSAO && (
        <ExcluirMembroDialog
          membro={dialogo.membro}
          onFechar={fecharDialogo}
          onExcluido={() => concluir('Membro excluído.')}
          onMembroRemovido={aoMembroRemovido}
        />
      )}
    </>
  );
}
