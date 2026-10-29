import { useId, useState } from 'react';
import { LIMITE_NOME_CATEGORIA, OPCOES_TIPO_MOVIMENTACAO } from '../../constants/financeiro';
import { mapearErroCategoria, montarPayloadCategoria, validarCategoria, valoresIniciaisCategoria } from '../../schemas/categoriaSchema';
import { categoriasService } from '../../services/financial/categoriasService';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { SelectField, TextField } from '../ui/FormField';
import { Modal } from '../ui/Modal';
import styles from './NovaCategoriaDialog.module.css';

const OPCOES_TIPO = [{ valor: '', rotulo: 'Escolha…' }, ...OPCOES_TIPO_MOVIMENTACAO.map(({ valor, rotulo }) => ({ valor, rotulo }))];

/**
 * Cria uma categoria sem sair do formulário de movimentação (A e T). Começa com o tipo já escolhido
 * no formulário. onCriada(categoria) devolve a CategoriaFinanceiraResponse, que já fica selecionada.
 *   existentes: categorias carregadas, para avisar de nome repetido antes do 409.
 */
export function NovaCategoriaDialog({ tipoInicial, existentes, onCriada, onFechar }) {
  const idFormulario = useId();
  const [valores, setValores] = useState(() => valoresIniciaisCategoria({ tipo: tipoInicial }));
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState(null);
  const [enviando, setEnviando] = useState(false);

  function alterar(campo, valor) {
    setValores((atuais) => ({ ...atuais, [campo]: valor }));
    setErros((atuais) => ({ ...atuais, [campo]: undefined }));
  }

  async function enviar(evento) {
    evento.preventDefault();
    evento.stopPropagation(); // a modal fica dentro do formulário da movimentação na árvore do React
    if (enviando) return;
    setErroGeral(null);
    const encontrados = validarCategoria(valores, { existentes });
    setErros(encontrados);
    const primeiro = ['nome', 'tipo'].find((campo) => encontrados[campo]);
    if (primeiro) {
      document.getElementById(`${idFormulario}-${primeiro}`)?.focus();
      return;
    }

    setEnviando(true);
    try {
      onCriada(await categoriasService.cadastrar(montarPayloadCategoria(valores)));
    } catch (erro) {
      setEnviando(false);
      if (erro.isFimDeSessao?.()) return;
      const { camposErro, erroGeral: mensagem } = mapearErroCategoria(erro);
      setErros(camposErro);
      setErroGeral(mensagem);
    }
  }

  return (
    <Modal
      aberto
      titulo="Nova categoria"
      descricao="A categoria fica disponível para todas as movimentações do mesmo tipo."
      onFechar={onFechar}
      podeFechar={!enviando}
      tamanho="pequeno"
      rodape={
        <>
          <Button variante="secundario" onClick={onFechar} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" form={idFormulario} carregando={enviando}>
            Criar categoria
          </Button>
        </>
      }
    >
      <form id={idFormulario} className={styles.formulario} onSubmit={enviar} noValidate>
        {erroGeral && <Alert>{erroGeral}</Alert>}
        <TextField
          id={`${idFormulario}-nome`}
          rotulo="Nome"
          obrigatorio
          autoComplete="off"
          maxLength={LIMITE_NOME_CATEGORIA}
          value={valores.nome}
          erro={erros.nome}
          onChange={(evento) => alterar('nome', evento.target.value)}
          data-autofocus
        />
        <SelectField
          id={`${idFormulario}-tipo`}
          rotulo="Tipo"
          obrigatorio
          opcoes={OPCOES_TIPO}
          value={valores.tipo}
          erro={erros.tipo}
          onChange={(evento) => alterar('tipo', evento.target.value)}
        />
      </form>
    </Modal>
  );
}
