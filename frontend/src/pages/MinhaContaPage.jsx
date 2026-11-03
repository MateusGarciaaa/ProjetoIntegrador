import { useEffect, useId, useState } from 'react';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { PasswordField } from '../components/ui/PasswordField';
import { rotuloPerfil } from '../constants/perfis';
import { useAuth } from '../hooks/useAuth';
import { useEnvioUnico } from '../hooks/useEnvioUnico';
import { useTituloPagina } from '../hooks/useTituloPagina';
import { useToast } from '../hooks/useToast';
import {
  CAMPOS_TROCA_SENHA,
  mapearErroTrocaSenha,
  montarPayloadTrocaSenha,
  validarTrocaSenha,
  VALORES_INICIAIS_TROCA_SENHA,
} from '../schemas/contaSchema';
import { SENHA_MAX, SENHA_MIN } from '../schemas/senhaSchema';
import { contaService } from '../services/conta/contaService';
import { TIPOS_ERRO } from '../services/http/apiError';
import styles from './MinhaContaPage.module.css';

/** Dados da conta lidos do servidor (GET /me); enquanto não chegam, os da sessão. */
function useDadosDaConta() {
  const { usuario } = useAuth();
  const [dados, setDados] = useState(null);

  useEffect(() => {
    const controle = new AbortController();
    contaService
      .buscar({ signal: controle.signal })
      .then(setDados)
      .catch((erro) => {
        if (erro.tipo !== TIPOS_ERRO.CANCELADO) setDados(null);
      });
    return () => controle.abort();
  }, []);

  return {
    nome: dados?.nome ?? usuario.nome ?? '—',
    email: dados?.email ?? usuario.email,
    perfil: dados?.perfil ?? usuario.perfil,
  };
}

function DadosDaConta() {
  const { nome, email, perfil } = useDadosDaConta();
  return (
    <Card titulo="Seus dados">
      <dl className={styles.dados}>
        <div>
          <dt>Nome</dt>
          <dd>{nome}</dd>
        </div>
        <div>
          <dt>E-mail (login)</dt>
          <dd>{email}</dd>
        </div>
        <div>
          <dt>Perfil</dt>
          <dd>{rotuloPerfil(perfil)}</dd>
        </div>
      </dl>
      <p className={styles.nota}>Para mudar o nome, o e-mail ou o perfil, fale com o administrador do sistema.</p>
    </Card>
  );
}

/**
 * Troca de senha logado. O backend devolve um token novo (a troca derruba os tokens anteriores,
 * inclusive o desta aba); a sessão passa a usá-lo e continua aberta.
 */
function TrocaDeSenha() {
  const { renovarSessao } = useAuth();
  const toast = useToast();
  const idBase = useId();
  const { enviando, executar } = useEnvioUnico();
  const [valores, setValores] = useState(VALORES_INICIAIS_TROCA_SENHA);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState(null);
  const [tentouEnviar, setTentouEnviar] = useState(false);

  const idCampo = (campo) => `${idBase}-${campo}`;

  function alterar(campo, valor) {
    const proximos = { ...valores, [campo]: valor };
    setValores(proximos);
    if (tentouEnviar) setErros(validarTrocaSenha(proximos));
  }

  async function enviar(evento) {
    evento.preventDefault();
    setTentouEnviar(true);
    setErroGeral(null);
    const encontrados = validarTrocaSenha(valores);
    setErros(encontrados);
    const primeiroInvalido = CAMPOS_TROCA_SENHA.find((campo) => encontrados[campo]);
    if (primeiroInvalido) {
      document.getElementById(idCampo(primeiroInvalido))?.focus();
      return;
    }

    await executar(async () => {
      try {
        const resposta = await contaService.alterarSenha(montarPayloadTrocaSenha(valores));
        renovarSessao(resposta);
        setValores(VALORES_INICIAIS_TROCA_SENHA);
        setErros({});
        setTentouEnviar(false);
        toast.sucesso('Senha alterada. As outras sessões abertas com a senha antiga foram encerradas.');
      } catch (erro) {
        if (erro.isFimDeSessao?.()) return;
        const { camposErro, erroGeral: mensagemGeral } = mapearErroTrocaSenha(erro);
        setErros(camposErro);
        setErroGeral(mensagemGeral);
        const campoComErro = CAMPOS_TROCA_SENHA.find((campo) => camposErro[campo]);
        if (campoComErro) document.getElementById(idCampo(campoComErro))?.focus();
      }
    });
  }

  return (
    <Card titulo="Trocar senha">
      <form className={styles.formulario} onSubmit={enviar} noValidate>
        {erroGeral && <Alert>{erroGeral}</Alert>}
        <PasswordField
          id={idCampo('senhaAtual')}
          name="senhaAtual"
          rotulo="Senha atual"
          autoComplete="current-password"
          value={valores.senhaAtual}
          erro={erros.senhaAtual}
          onChange={(evento) => alterar('senhaAtual', evento.target.value)}
        />
        <PasswordField
          id={idCampo('novaSenha')}
          name="novaSenha"
          rotulo="Nova senha"
          autoComplete="new-password"
          dica={`De ${SENHA_MIN} a ${SENHA_MAX} caracteres, diferente da atual.`}
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
        <div className={styles.acoes}>
          <Button type="submit" carregando={enviando}>
            {enviando ? 'Salvando…' : 'Trocar senha'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Minha conta: qualquer perfil vê os próprios dados e troca a própria senha. */
export function MinhaContaPage() {
  useTituloPagina('Minha conta');
  return (
    <>
      <PageHeader titulo="Minha conta" descricao="Seus dados de acesso ao ChurchHub." />
      <div className={styles.grade}>
        <DadosDaConta />
        <TrocaDeSenha />
      </div>
    </>
  );
}
