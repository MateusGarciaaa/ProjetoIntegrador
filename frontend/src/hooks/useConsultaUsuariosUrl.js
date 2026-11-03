import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { lerConsultaUsuarios, parametrosDaConsultaUsuarios } from '../schemas/consultaUsuarios';

/**
 * Consulta da lista de usuários guardada na URL (ver schemas/consultaUsuarios.js), como a de
 * membros: filtro novo volta para a 1ª página; a digitação da busca substitui a entrada do histórico.
 */
export function useConsultaUsuariosUrl() {
  const [parametros, setParametros] = useSearchParams();
  const consulta = useMemo(() => lerConsultaUsuarios(parametros), [parametros]);

  const atualizar = useCallback(
    (mudancas, { substituir = false } = {}) => {
      setParametros(
        (atuais) => new URLSearchParams(parametrosDaConsultaUsuarios({ ...lerConsultaUsuarios(atuais), ...mudancas })),
        { replace: substituir },
      );
    },
    [setParametros],
  );

  const acoes = useMemo(
    () => ({
      buscar: (nome) => atualizar({ nome, pagina: 0 }, { substituir: true }),
      filtrarPerfil: (perfil) => atualizar({ perfil, pagina: 0 }),
      filtrarSituacao: (situacao) => atualizar({ situacao, pagina: 0 }),
      mudarPagina: (pagina) => atualizar({ pagina }),
      corrigirPagina: (pagina) => atualizar({ pagina }, { substituir: true }),
      limpar: () => atualizar({ nome: '', perfil: '', situacao: '', pagina: 0 }),
    }),
    [atualizar],
  );

  return { consulta, ...acoes };
}
