import { useId, useState } from 'react';
import { LIMITES_USUARIO, OPCOES_PERFIL } from '../../constants/usuarios';
import { useEnvioUnico } from '../../hooks/useEnvioUnico';
import {
  CAMPOS_USUARIO,
  mapearErroUsuario,
  montarPayloadUsuario,
  validarUsuario,
  valoresIniciaisUsuario,
} from '../../schemas/usuarioSchema';
import { TIPOS_ERRO } from '../../services/http/apiError';
import { usuariosService } from '../../services/usuarios/usuariosService';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { SelectField, TextField } from '../ui/FormField';
import styles from './UsuarioEditor.module.css';

const OPCOES_COM_ESCOLHA = [{ valor: '', rotulo: 'Escolha um perfil' }, ...OPCOES_PERFIL];

/**
 * Cadastro (usuario ausente) ou edição (usuario presente). O cadastro não tem senha: o backend
 * envia o convite. Na edição o e-mail (login) não muda, e a própria conta não troca de perfil
 * (o backend recusaria tirar o próprio perfil de Administrador).
 * onSalvo(usuarioSalvo); onUsuarioRemovido() se ele sumiu (404) durante a edição.
 */
export function UsuarioEditor({ usuario, propriaConta = false, onSalvo, onCancelar, onUsuarioRemovido }) {
  const editando = Boolean(usuario);
  const idFormulario = useId();
  const [valores, setValores] = useState(() => valoresIniciaisUsuario(usuario));
  const [erros, setErros] = useState({});
  const [tentouEnviar, setTentouEnviar] = useState(false);
  const [erroGeral, setErroGeral] = useState(null);
  const { enviando, executar } = useEnvioUnico();

  const idCampo = (campo) => `${idFormulario}-${campo}`;

  function alterar(campo, valor) {
    const proximos = { ...valores, [campo]: valor };
    setValores(proximos);
    if (tentouEnviar) setErros(validarUsuario(proximos, { editando }));
  }

  function sairDoCampo(campo) {
    const mensagem = validarUsuario(valores, { editando })[campo];
    setErros(({ [campo]: _removido, ...restantes }) => (mensagem ? { ...restantes, [campo]: mensagem } : restantes));
  }

  async function enviar(evento) {
    evento.preventDefault();
    setTentouEnviar(true);
    setErroGeral(null);
    const encontrados = validarUsuario(valores, { editando });
    setErros(encontrados);
    const primeiroInvalido = CAMPOS_USUARIO.find((campo) => encontrados[campo]);
    if (primeiroInvalido) {
      document.getElementById(idCampo(primeiroInvalido))?.focus();
      return;
    }

    await executar(async () => {
      const payload = montarPayloadUsuario(valores, { editando });
      try {
        const salvo = editando ? await usuariosService.atualizar(usuario.id, payload) : await usuariosService.cadastrar(payload);
        onSalvo(salvo);
      } catch (erro) {
        if (erro.isFimDeSessao?.()) return;
        if (editando && erro.tipo === TIPOS_ERRO.NAO_ENCONTRADO) {
          onUsuarioRemovido();
          return;
        }
        const { camposErro, erroGeral: mensagemGeral } = mapearErroUsuario(erro);
        setErros((atuais) => ({ ...atuais, ...camposErro }));
        setErroGeral(mensagemGeral);
        const campoComErro = Object.keys(camposErro)[0];
        if (campoComErro) document.getElementById(idCampo(campoComErro))?.focus();
      }
    });
  }

  function campo(nome) {
    return {
      id: idCampo(nome),
      name: nome,
      value: valores[nome],
      erro: erros[nome],
      onChange: (evento) => alterar(nome, evento.target.value),
      onBlur: () => sairDoCampo(nome),
    };
  }

  return (
    <form id={idFormulario} className={styles.formulario} onSubmit={enviar} noValidate>
      {erroGeral && <Alert>{erroGeral}</Alert>}
      {!editando && (
        <Alert tom="info">
          A pessoa recebe por e-mail um convite, válido por 72 horas, para definir a própria senha. Ninguém mais conhece essa senha.
        </Alert>
      )}

      <TextField {...campo('nome')} rotulo="Nome" obrigatorio autoComplete="off" maxLength={LIMITES_USUARIO.nome} data-autofocus />
      <TextField
        {...campo('email')}
        rotulo="E-mail"
        obrigatorio={!editando}
        type="email"
        inputMode="email"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck="false"
        maxLength={LIMITES_USUARIO.email}
        disabled={editando}
        dica={editando ? 'O e-mail é o login da pessoa e não muda por aqui.' : 'Será o login da pessoa.'}
      />
      <SelectField
        {...campo('perfil')}
        rotulo="Perfil"
        obrigatorio
        opcoes={OPCOES_COM_ESCOLHA}
        disabled={propriaConta}
        dica={propriaConta ? 'Você não pode mudar o seu próprio perfil.' : 'Cada usuário tem exatamente um perfil.'}
      />

      <div className={styles.acoes}>
        <Button variante="secundario" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </Button>
        <Button type="submit" carregando={enviando}>
          {editando ? 'Salvar alterações' : 'Cadastrar e enviar convite'}
        </Button>
      </div>
    </form>
  );
}
