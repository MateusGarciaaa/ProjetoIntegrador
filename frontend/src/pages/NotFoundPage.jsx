import { Link, useLocation } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { ROTA_PADRAO_AUTENTICADA } from '../constants/rotas';
import { useTituloPagina } from '../hooks/useTituloPagina';

export function NotFoundPage() {
  const { pathname } = useLocation();
  useTituloPagina('Página não encontrada');

  return (
    <EmptyState
      icone="busca"
      titulo="Página não encontrada"
      descricao={`O endereço ${pathname} não existe no ChurchHub.`}
      acao={<Link to={ROTA_PADRAO_AUTENTICADA}>Voltar para Membros</Link>}
    />
  );
}
