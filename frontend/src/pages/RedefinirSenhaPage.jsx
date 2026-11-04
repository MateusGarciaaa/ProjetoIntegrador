import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RedefinirSenhaForm } from '../components/auth/RedefinirSenhaForm';
import { useTituloPagina } from '../hooks/useTituloPagina';
import { textosDoLink } from '../schemas/senhaSchema';
import styles from './PaginaAuth.module.css';

function lerToken(parametros) {
  return parametros.get('token')?.trim() || null;
}

/**
 * Aberta pelo link do e-mail: /reset-password?token=<UUID>. No convite de um usuário novo,
 * o link traz &convite=1 e a tela dá as boas-vindas; a validação é a mesma (a do token).
 * O token é lido uma vez e sai da URL (replace): não fica no histórico nem na barra de endereço.
 * Recarregar a página depois disso mostra "link inválido"; basta abrir o link do e-mail de novo.
 */
export function RedefinirSenhaPage() {
  const [parametros, setParametros] = useSearchParams();
  const tokenNaUrl = parametros.has('token');
  const [token, setToken] = useState(() => lerToken(parametros));
  const textos = textosDoLink(parametros);
  useTituloPagina(textos.titulo);

  // Um novo link aberto na mesma aba traz outro token: a tela passa a usá-lo.
  if (tokenNaUrl && lerToken(parametros) !== token) setToken(lerToken(parametros));

  useEffect(() => {
    if (!tokenNaUrl) return;
    const semToken = new URLSearchParams(parametros);
    semToken.delete('token');
    setParametros(semToken, { replace: true });
  }, [tokenNaUrl, parametros, setParametros]);

  return (
    <>
      <h1 className={styles.titulo}>{textos.titulo}</h1>
      <p className={styles.descricao}>{textos.descricao}</p>
      {/* key: um novo link na mesma aba recomeça o formulário. */}
      <RedefinirSenhaForm key={token ?? ''} token={token} textos={textos} />
    </>
  );
}
