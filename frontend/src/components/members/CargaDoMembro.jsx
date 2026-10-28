import { Button, ButtonLink } from '../ui/Button';
import { CarregandoPagina } from '../ui/CarregandoPagina';
import { EmptyState } from '../ui/EmptyState';

/** O que mostrar enquanto o membro (useMembro) não está disponível: carregando, inexistente ou erro. */
export function CargaDoMembro({ erro, naoEncontrado, recarregar, voltarPara }) {
  if (naoEncontrado) {
    return (
      <EmptyState
        icone="busca"
        titulo="Membro não encontrado"
        descricao="Este membro não está no cadastro. Ele pode ter sido excluído ou o endereço está incorreto."
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
        titulo="Não foi possível carregar o membro"
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
