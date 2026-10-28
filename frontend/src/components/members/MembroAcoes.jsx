import { caminhoEdicaoMembro } from '../../constants/rotas';
import { Button, ButtonLink } from '../ui/Button';

/**
 * Ações de um membro (na linha da lista e nos detalhes). O nome entra no rótulo acessível
 * para diferenciar as linhas. `estado` segue no link (ex.: para onde voltar depois).
 */
export function MembroAcoes({ membro, podeEditar, podeExcluir, onExcluir, estado, pequeno = true }) {
  return (
    <>
      {podeEditar && (
        <ButtonLink
          variante={pequeno ? 'fantasma' : 'secundario'}
          pequeno={pequeno}
          icone="editar"
          aria-label={`Editar ${membro.nome}`}
          to={caminhoEdicaoMembro(membro.id)}
          state={estado}
        >
          Editar
        </ButtonLink>
      )}
      {podeExcluir && (
        <Button variante="perigoSuave" pequeno={pequeno} icone="excluir" aria-label={`Excluir ${membro.nome}`} onClick={() => onExcluir(membro)}>
          Excluir
        </Button>
      )}
    </>
  );
}
