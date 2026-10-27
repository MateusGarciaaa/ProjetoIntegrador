import { Link, useLocation } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { rotaInicialDoPerfil } from '../constants/rotas';
import { usePermissao } from '../hooks/usePermissao';
import { useTituloPagina } from '../hooks/useTituloPagina';

export function NotFoundPage() {
  const { pathname } = useLocation();
  const { perfil } = usePermissao();
  useTituloPagina('Página não encontrada');

  return (
    <EmptyState
      icone="busca"
      titulo="Página não encontrada"
      descricao={`O endereço ${pathname} não existe no ChurchHub.`}
      acao={<Link to={rotaInicialDoPerfil(perfil)}>Voltar para o início</Link>}
    />
  );
}
