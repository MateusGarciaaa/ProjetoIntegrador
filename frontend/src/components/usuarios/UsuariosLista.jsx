import { useLocation } from 'react-router-dom';
import { rotuloPerfil } from '../../constants/perfis';
import { caminhoEdicaoUsuario, ROTAS } from '../../constants/rotas';
import { Button, ButtonLink } from '../ui/Button';
import { Table } from '../ui/Table';
import { UsuarioSituacao } from './UsuarioSituacao';
import styles from './UsuariosLista.module.css';

function colunas(emailLogado) {
  return [
    {
      chave: 'nome',
      rotulo: 'Nome',
      principal: true,
      renderizar: (usuario) => (
        <>
          {usuario.nome}
          {usuario.email === emailLogado && <span className={styles.voce}>(você)</span>}
        </>
      ),
    },
    { chave: 'email', rotulo: 'E-mail', className: styles.secundario, renderizar: (usuario) => usuario.email },
    { chave: 'perfil', rotulo: 'Perfil', renderizar: (usuario) => rotuloPerfil(usuario.perfil) },
    { chave: 'situacao', rotulo: 'Situação', destaque: true, renderizar: (usuario) => <UsuarioSituacao usuario={usuario} /> },
  ];
}

/**
 * Lista de usuários com as ações do Administrador. A própria conta não tem "Desativar" (o backend
 * recusaria com 409); "Reenviar convite" só aparece para quem está ativo e ainda não definiu a senha.
 * O nome entra no rótulo acessível de cada botão para diferenciar as linhas.
 */
export function UsuariosLista({ usuarios, emailLogado, conviteEmEnvio, onAlterarSituacao, onReenviarConvite }) {
  const { search } = useLocation();
  const estado = { voltarPara: `${ROTAS.USUARIOS}${search}` };

  const acoes = (usuario) => (
    <>
      <ButtonLink
        variante="fantasma"
        pequeno
        icone="editar"
        aria-label={`Editar ${usuario.nome}`}
        to={caminhoEdicaoUsuario(usuario.id)}
        state={estado}
      >
        Editar
      </ButtonLink>
      {usuario.ativo && usuario.convitePendente && (
        <Button
          variante="fantasma"
          pequeno
          icone="envelope"
          aria-label={`Reenviar convite para ${usuario.nome}`}
          carregando={conviteEmEnvio === usuario.id}
          onClick={() => onReenviarConvite(usuario)}
        >
          Reenviar convite
        </Button>
      )}
      {usuario.email !== emailLogado &&
        (usuario.ativo ? (
          <Button variante="perigoSuave" pequeno aria-label={`Desativar ${usuario.nome}`} onClick={() => onAlterarSituacao(usuario)}>
            Desativar
          </Button>
        ) : (
          <Button variante="secundario" pequeno aria-label={`Ativar ${usuario.nome}`} onClick={() => onAlterarSituacao(usuario)}>
            Ativar
          </Button>
        ))}
    </>
  );

  return <Table legenda="Usuários do sistema" colunas={colunas(emailLogado)} itens={usuarios} acoes={acoes} />;
}
