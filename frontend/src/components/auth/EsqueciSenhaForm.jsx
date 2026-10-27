import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROTAS } from '../../constants/rotas';
import { useEsqueciSenha } from '../../hooks/useRecuperacaoSenha';
import { MENSAGEM_NEUTRA_ESQUECI, VALORES_INICIAIS_ESQUECI, validarEsqueciSenha } from '../../schemas/senhaSchema';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { TextField } from '../ui/FormField';
import styles from './LoginForm.module.css';

/** Depois do envio, mostra sempre a mesma mensagem, qualquer que seja a resposta do servidor. */
export function EsqueciSenhaForm() {
  const { enviando, enviado, solicitar } = useEsqueciSenha();
  const idEmail = `${useId()}-email`;
  const [valores, setValores] = useState(VALORES_INICIAIS_ESQUECI);
  const [erros, setErros] = useState({});
  const [tentouEnviar, setTentouEnviar] = useState(false);

  function alterar(email) {
    setValores({ email });
    if (tentouEnviar) setErros(validarEsqueciSenha({ email }));
  }

  function enviar(evento) {
    evento.preventDefault();
    setTentouEnviar(true);
    const encontrados = validarEsqueciSenha(valores);
    setErros(encontrados);
    if (encontrados.email) {
      document.getElementById(idEmail)?.focus();
      return;
    }
    solicitar(valores.email);
  }

  if (enviado) {
    return (
      <div className={styles.formulario}>
        <Alert tom="info">{MENSAGEM_NEUTRA_ESQUECI}</Alert>
        <p className={styles.rodape}>
          <Link to={ROTAS.LOGIN}>Voltar para o login</Link>
        </p>
      </div>
    );
  }

  return (
    <form className={styles.formulario} onSubmit={enviar} noValidate>
      <TextField
        id={idEmail}
        name="email"
        rotulo="E-mail"
        type="email"
        inputMode="email"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck="false"
        value={valores.email}
        erro={erros.email}
        onChange={(evento) => alterar(evento.target.value)}
      />
      <Button type="submit" blocoInteiro carregando={enviando} className={styles.enviar}>
        {enviando ? 'Enviando…' : 'Enviar link'}
      </Button>
      <p className={styles.rodape}>
        <Link to={ROTAS.LOGIN}>Voltar para o login</Link>
      </p>
    </form>
  );
}
