import { useCallback, useEffect, useState } from 'react';
import { TIPOS_ERRO } from '../services/http/apiError';
import { membrosService } from '../services/members/membrosService';

/**
 * Carrega um membro pelo id (GET /members/{id}), sempre fresco: a edição nunca parte
 * de dados velhos da lista. naoEncontrado cobre 404 e id que não é UUID (400).
 */
export function useMembro(id) {
  const [estado, setEstado] = useState({ membro: null, erro: null, carregando: true });
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    const controle = new AbortController();
    setEstado({ membro: null, erro: null, carregando: true });

    membrosService
      .buscarPorId(id, { signal: controle.signal })
      .then((membro) => setEstado({ membro, erro: null, carregando: false }))
      .catch((erro) => {
        if (erro.tipo === TIPOS_ERRO.CANCELADO) return;
        setEstado({ membro: null, erro, carregando: false });
      });

    return () => controle.abort();
  }, [id, versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  const { erro } = estado;
  const naoEncontrado = erro?.tipo === TIPOS_ERRO.NAO_ENCONTRADO || erro?.status === 400;

  return { ...estado, naoEncontrado, recarregar };
}
