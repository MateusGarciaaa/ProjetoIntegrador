import { useId, useState } from 'react';
import { useMembroForm } from '../../hooks/useMembroForm';
import { mapearErroDoServidor } from '../../schemas/membroSchema';
import { TIPOS_ERRO } from '../../services/http/apiError';
import { membrosService } from '../../services/members/membrosService';
import { hojeIso } from '../../utils/datas';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { MembroForm } from './MembroForm';

/**
 * Cadastro (membro ausente) ou edição (membro presente).
 * onSalvo(membroSalvo) no sucesso; onMembroRemovido() se o membro sumiu (404) durante a edição.
 */
export function MembroFormModal({ membro, onFechar, onSalvo, onMembroRemovido }) {
  const editando = Boolean(membro);
  const idFormulario = useId();
  const [hoje] = useState(hojeIso);
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
    <Modal
      aberto
      titulo={editando ? 'Editar membro' : 'Novo membro'}
      descricao={editando ? membro.nome : 'Preencha os dados para incluir a pessoa no cadastro.'}
      onFechar={onFechar}
      podeFechar={!enviando}
      rodape={
        <>
          <Button variante="secundario" onClick={onFechar} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" form={idFormulario} carregando={enviando}>
            {editando ? 'Salvar alterações' : 'Cadastrar membro'}
          </Button>
        </>
      }
    >
      <MembroForm
        idFormulario={idFormulario}
        valores={valores}
        erros={erros}
        erroGeral={erroGeral}
        hoje={hoje}
        onAlterar={alterar}
        onSairDoCampo={sairDoCampo}
        onEnviar={enviar}
      />
    </Modal>
  );
}
