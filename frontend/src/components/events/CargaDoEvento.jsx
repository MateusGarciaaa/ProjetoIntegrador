import { Button, ButtonLink } from '../ui/Button';
import { CarregandoPagina } from '../ui/CarregandoPagina';
import { EmptyState } from '../ui/EmptyState';

/** O que mostrar enquanto o evento (useEvento) não está disponível: carregando, inexistente ou erro. */
export function CargaDoEvento({ erro, naoEncontrado, recarregar, voltarPara }) {
  if (naoEncontrado) {
    return (
      <EmptyState
        icone="busca"
        titulo="Evento não encontrado"
        descricao="Este evento não está na agenda. Ele pode ter sido excluído ou o endereço está incorreto."
        acao={
          <ButtonLink variante="secundario" to={voltarPara}>
            Voltar para os eventos
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
        titulo="Não foi possível carregar o evento"
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
