import { useCallback, useEffect, useState } from 'react';
import { ExcluirMembroDialog } from '../components/members/ExcluirMembroDialog';
import { MembrosFiltros } from '../components/members/MembrosFiltros';
import { MembrosResultado } from '../components/members/MembrosResultado';
import { ButtonLink } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { PERMISSOES } from '../constants/permissoes';
import { ROTAS } from '../constants/rotas';
import { useConsultaMembrosUrl } from '../hooks/useConsultaMembrosUrl';
import { useMembros } from '../hooks/useMembros';
import { usePermissao } from '../hooks/usePermissao';
import { useTituloPagina } from '../hooks/useTituloPagina';
import { useToast } from '../hooks/useToast';
import { alternarOrdenacao } from '../utils/ordenacao';
import styles from './MembrosPage.module.css';

export function MembrosPage() {
  useTituloPagina('Membros');
  const toast = useToast();
  const { pode } = usePermissao();
  const { consulta, buscar, filtrarStatus, ordenar, mudarPagina, corrigirPagina, limpar } = useConsultaMembrosUrl();
  const { pagina, erro, carregando, recarregar } = useMembros(consulta);
  const [membroAExcluir, setMembroAExcluir] = useState(null);
  const ordenacao = { campo: consulta.campo, direcao: consulta.direcao };

  // Página que ficou vazia (último item excluído, ou ?pagina= alto demais na URL): vai para a última que existe.
  useEffect(() => {
    if (pagina && pagina.content.length === 0 && pagina.number > 0) {
      corrigirPagina(Math.max(0, pagina.totalPages - 1));
    }
  }, [pagina, corrigirPagina]);

  const fecharExclusao = useCallback(() => setMembroAExcluir(null), []);

  function aoExcluido() {
    toast.sucesso('Membro excluído.');
    fecharExclusao();
    recarregar();
  }

  function aoMembroRemovido() {
    toast.aviso('Este membro não está mais no cadastro. A lista foi atualizada.');
    fecharExclusao();
    recarregar();
  }

  const botaoNovo = pode(PERMISSOES.MEMBROS_CRIAR) && (
    <ButtonLink icone="mais" to={ROTAS.MEMBRO_NOVO} className={styles.novo}>
      Novo membro
    </ButtonLink>
  );

  return (
    <>
      <PageHeader titulo="Membros" descricao="Rol de membros e visitantes da igreja." />

      <div className={styles.barra}>
        <MembrosFiltros consulta={consulta} onBuscar={buscar} onFiltrarStatus={filtrarStatus} onOrdenar={ordenar} />
        {botaoNovo}
      </div>

      <section className={styles.painel} aria-label="Lista de membros">
        <MembrosResultado
          pagina={pagina}
          erro={erro}
          carregando={carregando}
          consulta={consulta}
          botaoNovo={botaoNovo}
          onRecarregar={recarregar}
          onLimpar={limpar}
          onMudarPagina={mudarPagina}
          lista={{
            ordenacao,
            onOrdenar: (campo) => ordenar(alternarOrdenacao(ordenacao, campo)),
            podeEditar: pode(PERMISSOES.MEMBROS_EDITAR),
            podeExcluir: pode(PERMISSOES.MEMBROS_EXCLUIR),
            onExcluir: setMembroAExcluir,
          }}
        />
      </section>

      {membroAExcluir && (
        <ExcluirMembroDialog
          membro={membroAExcluir}
          onFechar={fecharExclusao}
          onExcluido={aoExcluido}
          onMembroRemovido={aoMembroRemovido}
        />
      )}
    </>
  );
}
