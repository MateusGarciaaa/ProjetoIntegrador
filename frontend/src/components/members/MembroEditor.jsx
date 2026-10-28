import { useId, useState } from 'react';
import { useMembroForm } from '../../hooks/useMembroForm';
import { mapearErroDoServidor } from '../../schemas/membroSchema';
import { TIPOS_ERRO } from '../../services/http/apiError';
import { membrosService } from '../../services/members/membrosService';
import { Button } from '../ui/Button';
import { MembroForm } from './MembroForm';
import styles from './MembroEditor.module.css';

/**
 * Cadastro (membro ausente) ou edição (membro presente) com o mesmo MembroForm.
 * onSalvo(membroSalvo) no sucesso; onMembroRemovido() se o membro sumiu (404) durante a edição.
 * 409 de e-mail/CPF (RN03/RN04) e 400 do @Valid voltam para o campo correspondente.
 */
export function MembroEditor({ membro, onSalvo, onCancelar, onMembroRemovido }) {
  const editando = Boolean(membro);
  const idFormulario = useId();
  const { valores, erros, alterar, sairDoCampo, prepararEnvio, aplicarErrosDoServidor } = useMembroForm(membro);
  const [enviando, setEnviando] = useState(false);
  const [erroGeral, setErroGeral] = useState(null);

  function focarCampo(campo) {
    document.getElementById(`${idFormulario}-${campo}`)?.focus();
  }

  async function enviar(evento) {
    evento.preventDefault();
    if (enviando) return;
    setErroGeral(null);

    const { payload, primeiroInvalido } = prepararEnvio();
    if (!payload) {
      focarCampo(primeiroInvalido);
      return;
    }

    setEnviando(true);
    try {
      const salvo = editando ? await membrosService.atualizar(membro.id, payload) : await membrosService.cadastrar(payload);
      onSalvo(salvo);
    } catch (erro) {
      setEnviando(false);
      if (erro.isFimDeSessao?.()) return;
      if (editando && erro.tipo === TIPOS_ERRO.NAO_ENCONTRADO) {
        onMembroRemovido();
        return;
      }
      const { camposErro, erroGeral: mensagemGeral } = mapearErroDoServidor(erro);
      aplicarErrosDoServidor(camposErro);
      setErroGeral(mensagemGeral);
      const campoComErro = Object.keys(camposErro)[0];
      if (campoComErro) focarCampo(campoComErro);
    }
  }

  return (
    <MembroForm
      idFormulario={idFormulario}
      valores={valores}
      erros={erros}
      erroGeral={erroGeral}
      onAlterar={alterar}
      onSairDoCampo={sairDoCampo}
      onEnviar={enviar}
    >
      <div className={styles.acoes}>
        <Button variante="secundario" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </Button>
        <Button type="submit" carregando={enviando}>
          {editando ? 'Salvar alterações' : 'Cadastrar membro'}
        </Button>
      </div>
    </MembroForm>
  );
}
