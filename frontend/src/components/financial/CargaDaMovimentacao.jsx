import { Button, ButtonLink } from '../ui/Button';
import { CarregandoPagina } from '../ui/CarregandoPagina';
import { EmptyState } from '../ui/EmptyState';

/** O que mostrar enquanto a movimentação (useMovimentacao) não está disponível: carregando, inexistente ou erro. */
export function CargaDaMovimentacao({ erro, naoEncontrado, recarregar, voltarPara }) {
  if (naoEncontrado) {
    return (
      <EmptyState
        icone="busca"
        titulo="Movimentação não encontrada"
        descricao="Esta movimentação não está mais no financeiro. Ela pode ter sido excluída ou o endereço está incorreto."
        acao={
          <ButtonLink variante="secundario" to={voltarPara}>
            Voltar para as movimentações
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
        titulo="Não foi possível carregar a movimentação"
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
