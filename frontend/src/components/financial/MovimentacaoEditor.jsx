import { useId, useState } from 'react';
import { PERMISSOES } from '../../constants/permissoes';
import { useCategorias } from '../../hooks/useCategorias';
import { useMovimentacaoForm } from '../../hooks/useMovimentacaoForm';
import { usePermissao } from '../../hooks/usePermissao';
import { isMovimentacaoInexistente, mapearErroDoServidor } from '../../schemas/movimentacaoSchema';
import { financeiroService } from '../../services/financial/financeiroService';
import { Button } from '../ui/Button';
import { MovimentacaoForm } from './MovimentacaoForm';
import { NovaCategoriaDialog } from './NovaCategoriaDialog';
import styles from './MovimentacaoEditor.module.css';

/**
 * Cadastro (movimentacao ausente) ou edição (presente) com o mesmo MovimentacaoForm.
 * onSalva(salva) no sucesso; onRemovida() se a movimentação sumiu (404) durante a edição.
 * 400 do @Valid e da regra tipo × categoria, e 404 de categoria/membro, voltam para o campo; o resto vai ao topo.
 *   hoje: "AAAA-MM-DD" no fuso da igreja (data inicial de uma movimentação nova).
 */
export function MovimentacaoEditor({ movimentacao, hoje, onSalva, onCancelar, onRemovida }) {
  const editando = Boolean(movimentacao);
  const idFormulario = useId();
  const { pode } = usePermissao();
  const { categorias, erro: erroCategorias, adicionar: adicionarCategoria } = useCategorias();
  const { valores, erros, alterar, sairDoCampo, prepararEnvio, aplicarErrosDoServidor, escolherCategoria } = useMovimentacaoForm(
    movimentacao,
    { hoje, categorias },
  );
  const [enviando, setEnviando] = useState(false);
  const [erroGeral, setErroGeral] = useState(null);
  const [criandoCategoria, setCriandoCategoria] = useState(false);

  function focarCampo(campo) {
    document.getElementById(`${idFormulario}-${campo}`)?.focus();
  }

  function aoCriarCategoria(categoria) {
    adicionarCategoria(categoria);
    setCriandoCategoria(false);
    // Fica escolhida, e o tipo passa a ser o dela (pode ter sido trocado na modal).
    escolherCategoria(categoria);
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
      const salva = editando ? await financeiroService.atualizar(movimentacao.id, payload) : await financeiroService.cadastrar(payload);
      onSalva(salva);
    } catch (erro) {
      setEnviando(false);
      if (erro.isFimDeSessao?.()) return;
      if (editando && isMovimentacaoInexistente(erro)) {
        onRemovida();
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
    <>
      <MovimentacaoForm
        idFormulario={idFormulario}
        valores={valores}
        erros={erros}
        erroGeral={erroGeral}
        categorias={categorias}
        erroCategorias={erroCategorias}
        onAlterar={alterar}
        onSairDoCampo={sairDoCampo}
        onNovaCategoria={pode(PERMISSOES.CATEGORIAS_CRIAR) ? () => setCriandoCategoria(true) : undefined}
        onEnviar={enviar}
      >
        <div className={styles.acoes}>
          <Button variante="secundario" onClick={onCancelar} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" carregando={enviando}>
            {editando ? 'Salvar alterações' : 'Cadastrar movimentação'}
          </Button>
        </div>
      </MovimentacaoForm>

      {/* Fora do <form> na árvore do React: o submit da modal não chega ao formulário da movimentação. */}
      {criandoCategoria && (
        <NovaCategoriaDialog
          tipoInicial={valores.tipo}
          existentes={categorias ?? []}
          onCriada={aoCriarCategoria}
          onFechar={() => setCriandoCategoria(false)}
        />
      )}
    </>
  );
}
