import { EmptyState } from '../components/ui/EmptyState';
import { perfisComPermissao } from '../constants/permissoes';
import { rotuloPerfil } from '../constants/perfis';
import { usePermissao } from '../hooks/usePermissao';
import { useTituloPagina } from '../hooks/useTituloPagina';

const LISTA = new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' });

export function SemAcessoPage({ permissao, area }) {
  const { perfil } = usePermissao();
  useTituloPagina('Sem acesso');
  const permitidos = LISTA.format(perfisComPermissao(permissao).map(rotuloPerfil));

  return (
    <EmptyState
      icone="cadeado"
      titulo={`Sem acesso a ${area}`}
      descricao={`Seu perfil (${rotuloPerfil(perfil)}) não pode ver esta área. Ela está disponível para: ${permitidos}. Se você precisa desse acesso, fale com o administrador da igreja.`}
    />
  );
}
