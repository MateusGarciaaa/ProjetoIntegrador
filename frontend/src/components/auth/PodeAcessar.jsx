import { usePermissao } from '../../hooks/usePermissao';

/**
 * Mostra o conteúdo só para perfis com a permissão; caso contrário, mostra `senao` (ou nada).
 * Apenas esconde a interface: quem garante a segurança é o @PreAuthorize do backend.
 */
export function PodeAcessar({ permissao, senao = null, children }) {
  const { pode } = usePermissao();
  return pode(permissao) ? children : senao;
}
