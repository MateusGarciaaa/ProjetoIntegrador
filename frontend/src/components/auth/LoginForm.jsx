import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROTAS } from '../../constants/rotas';
import { useAuth } from '../../hooks/useAuth';
import { useEnvioUnico } from '../../hooks/useEnvioUnico';
import { mensagemErroLogin, VALORES_INICIAIS_LOGIN, validarLogin } from '../../schemas/loginSchema';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { TextField } from '../ui/FormField';
import { PasswordField } from '../ui/PasswordField';
import { ContasDemonstracao } from './ContasDemonstracao';
import styles from './LoginForm.module.css';

const ORDEM_CAMPOS = ['email', 'password'];

/**
 * Após o login, quem redireciona é o GuestRoute (para a rota de origem ou a rota inicial
 * do perfil), então este componente não navega por conta própria.
 * demonstracao ({ contas, simulado }) só é informado em ambiente de apresentação.
 */
export function LoginForm({ demonstracao }) {
  const { entrar, limparAvisoSessao } = useAuth();
  const { enviando, executar } = useEnvioUnico();
  const idBase = useId();
  const [valores, setValores] = useState(VALORES_INICIAIS_LOGIN);
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState(null);
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

  function enviar(evento) {
    evento.preventDefault();
    executar(async () => {
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
      try {
        await entrar(valores);
      } catch (erro) {
        // 401 nunca diz se o erro está no e-mail ou na senha, e nenhum campo é marcado.
        setErroApi(mensagemErroLogin(erro));
      }
    });
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
        <p className={styles.rodape}>
          <Link to={ROTAS.ESQUECI_SENHA}>Esqueci minha senha</Link>
        </p>
      </form>
      {demonstracao && (
        <ContasDemonstracao
          contas={demonstracao.contas}
          simulado={demonstracao.simulado}
          desabilitado={enviando}
          onEscolher={preencherConta}
        />
      )}
    </>
  );
}
