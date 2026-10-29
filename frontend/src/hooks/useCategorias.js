import { useCallback, useEffect, useState } from 'react';
import { TIPOS_ERRO } from '../services/http/apiError';
import { categoriasService } from '../services/financial/categoriasService';

/**
 * Todas as categorias financeiras (a lista é pequena e não paginada), carregadas uma vez.
 * adicionar(categoria) inclui uma recém-criada sem buscar de novo.
 */
export function useCategorias() {
  const [estado, setEstado] = useState({ categorias: null, erro: null, carregando: true });
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    const controle = new AbortController();
    setEstado((anterior) => ({ ...anterior, erro: null, carregando: true }));

    categoriasService
      .listar({}, { signal: controle.signal })
      .then((categorias) => setEstado({ categorias, erro: null, carregando: false }))
      .catch((erro) => {
        if (erro.tipo === TIPOS_ERRO.CANCELADO) return;
        setEstado({ categorias: null, erro, carregando: false });
      });

    return () => controle.abort();
  }, [versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  const adicionar = useCallback((categoria) => {
    setEstado((anterior) => ({ ...anterior, categorias: [...(anterior.categorias ?? []), categoria] }));
  }, []);

  return { ...estado, recarregar, adicionar };
}
