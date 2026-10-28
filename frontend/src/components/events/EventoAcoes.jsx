import { useId } from 'react';
import { caminhoEdicaoEvento } from '../../constants/rotas';
import { Button, ButtonLink } from '../ui/Button';

/**
 * Ações de um evento (na linha da lista e nos detalhes). O título entra no rótulo acessível
 * para diferenciar as linhas. `edicao` vem de situacaoEdicaoEvento (RN09):
 *   não visível → sem botão; visível e bloqueado → "Editar" desabilitado com o motivo
 *   (title para o mouse, aria-describedby para leitor de tela; aria-disabled mantém o foco).
 */
export function EventoAcoes({ evento, edicao, podeExcluir, onExcluir, estado, pequeno = true }) {
  const idMotivo = useId();
  const variante = pequeno ? 'fantasma' : 'secundario';

  return (
    <>
      {edicao.visivel && edicao.permitido && (
        <ButtonLink
          variante={variante}
          pequeno={pequeno}
          icone="editar"
          aria-label={`Editar ${evento.titulo}`}
          to={caminhoEdicaoEvento(evento.id)}
          state={estado}
        >
          Editar
        </ButtonLink>
      )}
      {edicao.visivel && !edicao.permitido && (
        <>
          <Button
            variante={variante}
            pequeno={pequeno}
            icone="cadeado"
            aria-label={`Editar ${evento.titulo}`}
            aria-disabled="true"
            aria-describedby={idMotivo}
            title={edicao.motivo}
          >
            Editar
          </Button>
          <span id={idMotivo} className="sr-only">
            {edicao.motivo}
          </span>
        </>
      )}
      {podeExcluir && (
        <Button
          variante="perigoSuave"
          pequeno={pequeno}
          icone="excluir"
          aria-label={`Excluir ${evento.titulo}`}
          onClick={() => onExcluir(evento)}
        >
          Excluir
        </Button>
      )}
    </>
  );
}
