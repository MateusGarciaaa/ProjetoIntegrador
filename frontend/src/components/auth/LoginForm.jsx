import { useId, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { VALORES_INICIAIS_LOGIN, validarLogin } from '../../schemas/loginSchema';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { TextField } from '../ui/FormField';
import { PasswordField } from '../ui/PasswordField';
import { ContasDemonstracao } from './ContasDemonstracao';
import styles from './LoginForm.module.css';

const ORDEM_CAMPOS = ['email', 'password'];

/**
 * Após o login, quem redireciona é o GuestRoute (para a rota de origem ou /membros),
 * então este componente não navega por conta própria.
 * contasDemo só é informado no modo simulado.
 */
export function LoginForm({ contasDemo }) {
  const { entrar, limparAvisoSessao } = useAuth();
  const idBase = useId();
  const [valores, setValores] = useState(VALORES_INICIAIS_LOGIN);
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [tentouEnviar, setTentouEnviar] = useState(false);

  const idCampo = (campo) => `${idBase}-${campo}`;

  function alterar(campo, valor) {
    const proximos = { ...valores, [campo]: valor };
    setValores(proximos);
    if (tentouEnviar) setErros(validarLogin(proximos));
  }

  function preencherConta(conta) {
    setValores({ email: conta.email, password: conta.senha });
    setErros({});
    setErroApi(null);
  }

  async function enviar(evento) {
    evento.preventDefault();
    if (enviando) return;

    setTentouEnviar(true);
    const encontrados = validarLogin(valores);
    setErros(encontrados);
    const primeiroInvalido = ORDEM_CAMPOS.find((campo) => encontrados[campo]);
    if (primeiroInvalido) {
      document.getElementById(idCampo(primeiroInvalido))?.focus();
      return;
    }

    setErroApi(null);
    limparAvisoSessao();
    setEnviando(true);
    try {
      await entrar(valores);
    } catch (erro) {
      setErroApi(erro.message);
      setEnviando(false);
    }
  }

  return (
    <>
      <form className={styles.formulario} onSubmit={enviar} noValidate>
        {erroApi && <Alert>{erroApi}</Alert>}
        <TextField
          id={idCampo('email')}
          name="email"
          rotulo="E-mail"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck="false"
          value={valores.email}
          erro={erros.email}
          onChange={(evento) => alterar('email', evento.target.value)}
        />
        <PasswordField
          id={idCampo('password')}
          name="password"
          rotulo="Senha"
          autoComplete="current-password"
          value={valores.password}
          erro={erros.password}
          onChange={(evento) => alterar('password', evento.target.value)}
        />
        <Button type="submit" blocoInteiro carregando={enviando} className={styles.enviar}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
      {contasDemo && <ContasDemonstracao contas={contasDemo} desabilitado={enviando} onEscolher={preencherConta} />}
    </>
  );
}
