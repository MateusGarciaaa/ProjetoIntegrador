import { infoTipoMovimentacao, LIMITES_MOVIMENTACAO } from '../../constants/financeiro';
import { categoriasDoTipo, TAMANHO_DATA_MASCARADA } from '../../schemas/movimentacaoSchema';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { SelectField, TextField } from '../ui/FormField';
import { CampoTipoMovimentacao } from './CampoTipoMovimentacao';
import { SeletorMembro } from './SeletorMembro';
import styles from './MovimentacaoForm.module.css';

/** "1.234.567.890,12": 10 dígitos inteiros, 3 pontos, vírgula e 2 casas. */
const TAMANHO_VALOR_FORMATADO = 16;

function opcoesDeCategoria(categorias, tipo) {
  if (!tipo) return [{ valor: '', rotulo: 'Escolha o tipo primeiro' }];
  const doTipo = categoriasDoTipo(categorias, tipo);
  const vazio = doTipo.length ? 'Escolha…' : `Nenhuma categoria de ${infoTipoMovimentacao(tipo).rotulo.toLowerCase()}`;
  return [{ valor: '', rotulo: vazio }, ...doTipo.map((c) => ({ valor: c.id, rotulo: c.nome }))];
}

/**
 * Formulário "burro" de movimentação: recebe valores e erros e avisa mudanças. O estado vive em
 * useMovimentacaoForm; o envio, em MovimentacaoEditor. O valor é digitado no formato brasileiro
 * (vírgula decimal), sempre positivo; a categoria só lista as do tipo escolhido (RN10).
 *   onNovaCategoria: abre a criação de categoria (só para quem pode criar; ausente → sem botão).
 */
export function MovimentacaoForm({
  idFormulario,
  valores,
  erros,
  erroGeral,
  categorias,
  erroCategorias,
  onAlterar,
  onSairDoCampo,
  onNovaCategoria,
  onEnviar,
  children,
}) {
  function campo(nome) {
    return {
      id: `${idFormulario}-${nome}`,
      name: nome,
      value: valores[nome],
      erro: erros[nome],
      onChange: (evento) => onAlterar(nome, evento.target.value),
      onBlur: () => onSairDoCampo(nome),
    };
  }

  return (
    <form id={idFormulario} className={styles.formulario} onSubmit={onEnviar} noValidate>
      {erroGeral && <Alert>{erroGeral}</Alert>}
      <p className={styles.nota}>Campos marcados com * são obrigatórios.</p>

      <fieldset className={styles.secao}>
        <legend className={styles.legenda}>Movimentação</legend>
        <CampoTipoMovimentacao
          id={`${idFormulario}-tipo`}
          className={styles.inteiro}
          valor={valores.tipo}
          erro={erros.tipo}
          onAlterar={(tipo) => onAlterar('tipo', tipo)}
        />
        <TextField
          {...campo('valor')}
          className={styles.metade}
          rotulo="Valor (R$)"
          obrigatorio
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          maxLength={TAMANHO_VALOR_FORMATADO}
          dica="Sempre positivo, com vírgula nos centavos. Ex.: 1.234,56."
        />
        <TextField
          {...campo('data')}
          className={styles.metade}
          rotulo="Data"
          obrigatorio
          inputMode="numeric"
          autoComplete="off"
          placeholder="DD/MM/AAAA"
          maxLength={TAMANHO_DATA_MASCARADA}
        />
        <div className={styles.inteiro}>
          <div className={styles.categoria}>
            <SelectField
              {...campo('categoriaId')}
              className={styles.seletorCategoria}
              rotulo="Categoria"
              obrigatorio
              opcoes={opcoesDeCategoria(categorias, valores.tipo)}
              disabled={!valores.tipo || !categorias}
              dica={erroCategorias ? `Não foi possível carregar as categorias: ${erroCategorias.message}` : undefined}
            />
            {onNovaCategoria && (
              <Button variante="secundario" icone="mais" className={styles.novaCategoria} onClick={onNovaCategoria} disabled={!categorias}>
                Nova categoria
              </Button>
            )}
          </div>
        </div>
        <TextField
          {...campo('descricao')}
          className={styles.inteiro}
          rotulo="Descrição"
          obrigatorio
          autoComplete="off"
          maxLength={LIMITES_MOVIMENTACAO.descricao}
          placeholder="Ex.: Dízimo de outubro, Conta de energia"
        />
        <SeletorMembro
          id={`${idFormulario}-membro`}
          className={styles.inteiro}
          membro={valores.membro}
          erro={erros.membro}
          onAlterar={(membro) => onAlterar('membro', membro)}
        />
      </fieldset>

      {children}
    </form>
  );
}
