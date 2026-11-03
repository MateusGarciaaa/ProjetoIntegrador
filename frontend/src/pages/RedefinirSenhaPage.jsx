import { useSearchParams } from 'react-router-dom';
import { RedefinirSenhaForm } from '../components/auth/RedefinirSenhaForm';
import { useTituloPagina } from '../hooks/useTituloPagina';
import { textosDoLink } from '../schemas/senhaSchema';
import styles from './PaginaAuth.module.css';

/**
 * Aberta pelo link do e-mail: /reset-password?token=<UUID>. No convite de um usuário novo,
 * o link traz &convite=1 e a tela dá as boas-vindas; a validação é a mesma (a do token).
 */
export function RedefinirSenhaPage() {
  const [parametros] = useSearchParams();
  const token = parametros.get('token')?.trim() || null;
  const textos = textosDoLink(parametros);
  useTituloPagina(textos.titulo);

  return (
    <>
      <h1 className={styles.titulo}>{textos.titulo}</h1>
      <p className={styles.descricao}>{textos.descricao}</p>
      {/* key: um novo link na mesma aba recomeça o formulário. */}
      <RedefinirSenhaForm key={token ?? ''} token={token} textos={textos} />
    </>
  );
}
