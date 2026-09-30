import { Button } from '../ui/Button';

/** Botões por linha. O nome do membro entra no rótulo acessível para diferenciar as linhas. */
export function MembroAcoes({ membro, podeEditar, podeExcluir, onEditar, onExcluir }) {
  return (
    <>
      {podeEditar && (
        <Button variante="fantasma" pequeno icone="editar" aria-label={`Editar ${membro.nome}`} onClick={() => onEditar(membro)}>
          Editar
        </Button>
      )}
      {podeExcluir && (
        <Button variante="perigoSuave" pequeno icone="excluir" aria-label={`Excluir ${membro.nome}`} onClick={() => onExcluir(membro)}>
          Excluir
        </Button>
      )}
    </>
  );
}
