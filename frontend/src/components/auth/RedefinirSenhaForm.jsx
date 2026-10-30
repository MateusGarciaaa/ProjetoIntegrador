import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROTAS } from '../../constants/rotas';
import { ESTADOS_REDEFINICAO, useRedefinirSenha } from '../../hooks/useRecuperacaoSenha';
import {
  SENHA_MAX,
  SENHA_MIN,
  TEXTOS_LINK_SENHA,
  VALORES_INICIAIS_REDEFINICAO,
  validarRedefinicao,
} from '../../schemas/senhaSchema';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { PasswordField } from '../ui/PasswordField';
import styles from './LoginForm.module.css';

const ORDEM_CAMPOS = ['novaSenha', 'confirmacao'];

/**
 * token: o valor de ?token= do link enviado por e-mail (ausente = link inválido).
 * textos: os da redefinição ou os do convite (TEXTOS_LINK_SENHA), conforme o indicador do link.
 */
export function RedefinirSenhaForm({ token, textos = TEXTOS_LINK_SENHA.redefinicao }) {
  const { estado, enviando, redefinir } = useRedefinirSenha(token);
  const idBase = useId();
  const [valores, setValores] = useState(VALORES_INICIAIS_REDEFINICAO);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState(null);
  const [tentouEnviar, setTentouEnviar] = useState(false);

  const idCampo = (campo) => `${idBase}-${campo}`;

  function alterar(campo, valor) {
    const proximos = { ...valores, [campo]: valor };
    setValores(proximos);
    if (tentouEnviar) setErros(validarRedefinicao(proximos));
  }

  async function enviar(evento) {
    evento.preventDefault();
    setTentouEnviar(true);
    const encontrados = validarRedefinicao(valores);
    setErros(encontrados);
    const primeiroInvalido = ORDEM_CAMPOS.find((campo) => encontrados[campo]);
    if (primeiroInvalido) {
      document.getElementById(idCampo(primeiroInvalido))?.focus();
      return;
    }

    setErroGeral(null);
    const falha = await redefinir(valores.novaSenha);
    if (falha) {
      setErros(falha.camposErro);
      setErroGeral(falha.erroGeral);
    }
  }

  if (estado === ESTADOS_REDEFINICAO.TOKEN_INVALIDO) {
    return (
      <div className={styles.formulario}>
        <Alert>{textos.linkInvalido}</Alert>
        <p className={styles.rodape}>
          <Link to={ROTAS.ESQUECI_SENHA}>Pedir um novo link</Link>
        </p>
      </div>
    );
  }

  if (estado === ESTADOS_REDEFINICAO.SUCESSO) {
    return (
      <div className={styles.formulario}>
        <Alert tom="info">{textos.sucesso}</Alert>
        <p className={styles.rodape}>
          <Link to={ROTAS.LOGIN}>Ir para o login</Link>
        </p>
      </div>
    );
  }

  return (
    <form className={styles.formulario} onSubmit={enviar} noValidate>
      {erroGeral && <Alert>{erroGeral}</Alert>}
      <PasswordField
        id={idCampo('novaSenha')}
        name="novaSenha"
        rotulo="Nova senha"
        autoComplete="new-password"
        dica={`De ${SENHA_MIN} a ${SENHA_MAX} caracteres.`}
        value={valores.novaSenha}
        erro={erros.novaSenha}
        onChange={(evento) => alterar('novaSenha', evento.target.value)}
      />
      <PasswordField
        id={idCampo('confirmacao')}
        name="confirmacao"
        rotulo="Confirme a nova senha"
        autoComplete="new-password"
        value={valores.confirmacao}
        erro={erros.confirmacao}
        onChange={(evento) => alterar('confirmacao', evento.target.value)}
      />
      <Button type="submit" blocoInteiro carregando={enviando} className={styles.enviar}>
        {enviando ? 'Salvando…' : textos.botao}
      </Button>
    </form>
  );
}
