import { useId, useState } from 'react';
import { useEventoForm } from '../../hooks/useEventoForm';
import { mapearErroDoServidor } from '../../schemas/eventoSchema';
import { TIPOS_ERRO } from '../../services/http/apiError';
import { eventosService } from '../../services/events/eventosService';
import { Button } from '../ui/Button';
import { EventoForm } from './EventoForm';
import styles from './EventoEditor.module.css';

/**
 * Cadastro (evento ausente) ou edição (evento presente) com o mesmo EventoForm.
 * onSalvo(eventoSalvo) no sucesso; onEventoRemovido() se o evento sumiu (404) durante a edição.
 * 400 do @Valid volta para o campo correspondente; o 409 da RN09 (o evento encerrou com o
 * formulário aberto) e outros erros sem campo aparecem no topo.
 */
export function EventoEditor({ evento, dataSugerida, onSalvo, onCancelar, onEventoRemovido }) {
  const editando = Boolean(evento);
  const idFormulario = useId();
  const { valores, erros, alterar, sairDoCampo, prepararEnvio, aplicarErrosDoServidor } = useEventoForm(evento, { dataSugerida });
  const [enviando, setEnviando] = useState(false);
  const [erroGeral, setErroGeral] = useState(null);

  function focarCampo(campo) {
    document.getElementById(`${idFormulario}-${campo}`)?.focus();
  }

  async function enviar(evt) {
    evt.preventDefault();
    if (enviando) return;
    setErroGeral(null);

    const { payload, primeiroInvalido } = prepararEnvio();
    if (!payload) {
      focarCampo(primeiroInvalido);
      return;
    }

    setEnviando(true);
    try {
      const salvo = editando ? await eventosService.atualizar(evento.id, payload) : await eventosService.cadastrar(payload);
      onSalvo(salvo);
    } catch (erro) {
      setEnviando(false);
      if (erro.isFimDeSessao?.()) return;
      if (editando && erro.tipo === TIPOS_ERRO.NAO_ENCONTRADO) {
        onEventoRemovido();
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
    <EventoForm
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
          {editando ? 'Salvar alterações' : 'Cadastrar evento'}
        </Button>
      </div>
    </EventoForm>
  );
}
