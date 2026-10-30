import { useCallback, useEffect, useMemo, useState } from 'react';
import { filtrosDoServicoUsuarios } from '../schemas/consultaUsuarios';
import { TIPOS_ERRO } from '../services/http/apiError';
import { usuariosService } from '../services/usuarios/usuariosService';
import { useConsultaPaginada } from './useConsultaPaginada';

function buscarUsuarios(filtros, opcoes) {
  return usuariosService.listar(filtros, opcoes);
}

/** Página de usuários filtrada por nome, perfil e situação (o backend ordena por nome e id). */
export function useUsuarios({ nome, perfil, situacao, pagina }) {
  const filtros = useMemo(() => filtrosDoServicoUsuarios({ nome, perfil, situacao, pagina }), [nome, perfil, situacao, pagina]);
  return useConsultaPaginada(buscarUsuarios, filtros);
}

/**
 * Carrega um usuário pelo id (GET /users/{id}), sempre fresco: a edição nunca parte de dados
 * velhos da lista. naoEncontrado cobre 404 e id que não é UUID (400).
 */
export function useUsuario(id) {
  const [estado, setEstado] = useState({ usuario: null, erro: null });
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    const controle = new AbortController();
    setEstado({ usuario: null, erro: null });

    usuariosService
      .buscarPorId(id, { signal: controle.signal })
      .then((usuario) => setEstado({ usuario, erro: null }))
      .catch((erro) => {
        if (erro.tipo === TIPOS_ERRO.CANCELADO) return;
        setEstado({ usuario: null, erro });
      });

    return () => controle.abort();
  }, [id, versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  const { erro } = estado;
  const naoEncontrado = erro?.tipo === TIPOS_ERRO.NAO_ENCONTRADO || erro?.status === 400;

  return { ...estado, naoEncontrado, recarregar };
}
