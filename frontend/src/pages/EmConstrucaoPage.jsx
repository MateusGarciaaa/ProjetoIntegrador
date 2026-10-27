import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { useTituloPagina } from '../hooks/useTituloPagina';

/** Página provisória de um módulo que já tem rota, permissão e menu, mas ainda não tem tela. */
export function EmConstrucaoPage({ titulo }) {
  useTituloPagina(titulo);
  return (
    <>
      <PageHeader titulo={titulo} />
      <EmptyState
        icone="info"
        titulo="Em construção"
        descricao={`A área de ${titulo.toLowerCase()} ainda está sendo desenvolvida. Seu perfil já tem acesso a ela.`}
      />
    </>
  );
}
