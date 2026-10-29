import { useState } from 'react';
import { MINIMO_LETRAS_BUSCA_MEMBROS, useBuscaMembros } from '../../hooks/useBuscaMembros';
import { MembroStatusBadge } from '../members/MembroStatusBadge';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';
import { Icon } from '../ui/Icon';
import styles from './SeletorMembro.module.css';

/**
 * Membro vinculado (opcional; para dízimos e ofertas). Combobox ARIA: a pessoa digita o nome, a busca
 * vai ao GET /members/lookup (permissão membros.buscar, que o Tesoureiro tem) e cada resultado mostra o
 * status como selo. Setas navegam, Enter escolhe, Esc fecha. Escolhido, o membro aparece com "Remover".
 *   membro: { id, nome, status? } ou null. Na edição o status não vem no response, então não há selo.
 */
export function SeletorMembro({ id, membro, erro, onAlterar, className }) {
  const [termo, setTermo] = useState('');
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(-1);
  const { membros, total, erro: erroBusca, aguardando, curtoDemais } = useBuscaMembros(membro ? '' : termo);
  const idLista = `${id}-opcoes`;
  const idStatus = `${id}-status`;
  const mostrarLista = aberto && !curtoDemais && !aguardando && !erroBusca && membros.length > 0;

  function escolher(escolhido) {
    onAlterar(escolhido);
    setTermo('');
    setAberto(false);
    setDestaque(-1);
  }

  function remover() {
    onAlterar(null);
    // O campo de busca volta no lugar do membro; o foco vai para ele.
    requestAnimationFrame(() => document.getElementById(id)?.focus());
  }

  function aoPressionarTecla(evento) {
    if (evento.key === 'ArrowDown' && membros.length) {
      evento.preventDefault();
      setAberto(true);
      setDestaque((atual) => (atual + 1) % membros.length);
    } else if (evento.key === 'ArrowUp' && membros.length) {
      evento.preventDefault();
      setAberto(true);
      setDestaque((atual) => (atual <= 0 ? membros.length - 1 : atual - 1));
    } else if (evento.key === 'Enter' && mostrarLista && destaque >= 0) {
      evento.preventDefault();
      escolher(membros[destaque]);
    } else if (evento.key === 'Escape' && aberto) {
      evento.stopPropagation();
      setAberto(false);
    }
  }

  function situacao() {
    if (curtoDemais) return termo ? `Digite ao menos ${MINIMO_LETRAS_BUSCA_MEMBROS} letras do nome.` : '';
    if (aguardando) return 'Buscando membros…';
    if (erroBusca) return erroBusca.message;
    if (membros.length === 0) return 'Nenhum membro encontrado com esse nome.';
    if (total > membros.length) return `Mostrando ${membros.length} de ${total}. Digite mais do nome para refinar.`;
    return `${membros.length} ${membros.length === 1 ? 'membro encontrado' : 'membros encontrados'}.`;
  }

  if (membro) {
    return (
      <FormField id={`${id}-escolhido`} rotulo="Membro vinculado" erro={erro} className={className}>
        {(acessibilidade) => (
          <div className={styles.escolhido} {...acessibilidade} role="group" aria-label={`Membro vinculado: ${membro.nome}`}>
            <Icon nome="membros" tamanho={18} />
            <span className={styles.nome}>{membro.nome}</span>
            {membro.status && <MembroStatusBadge status={membro.status} />}
            <Button variante="fantasma" pequeno icone="fechar" className={styles.remover} onClick={remover} aria-label={`Remover ${membro.nome}`}>
              Remover
            </Button>
          </div>
        )}
      </FormField>
    );
  }

  return (
    <FormField id={id} rotulo="Membro vinculado" dica="Opcional. Use para dízimos e ofertas de um membro." erro={erro} className={className}>
      {({ 'aria-describedby': descricao, ...acessibilidade }) => (
        <div className={styles.combobox}>
          <input
            {...acessibilidade}
            className={styles.entrada}
            type="text"
            role="combobox"
            autoComplete="off"
            placeholder="Buscar pelo nome"
            aria-autocomplete="list"
            aria-expanded={mostrarLista}
            aria-controls={idLista}
            aria-activedescendant={mostrarLista && destaque >= 0 ? `${idLista}-${destaque}` : undefined}
            aria-describedby={[descricao, idStatus].filter(Boolean).join(' ')}
            value={termo}
            onChange={(evento) => {
              setTermo(evento.target.value);
              setAberto(true);
              setDestaque(-1);
            }}
            onFocus={() => setAberto(true)}
            onBlur={() => setAberto(false)}
            onKeyDown={aoPressionarTecla}
          />
          <p id={idStatus} className={styles.situacao} aria-live="polite">
            {aberto || termo ? situacao() : ''}
          </p>
          <ul id={idLista} role="listbox" aria-label="Membros encontrados" className={styles.lista} hidden={!mostrarLista}>
            {membros.map((opcao, indice) => (
              <li
                key={opcao.id}
                id={`${idLista}-${indice}`}
                role="option"
                aria-selected={indice === destaque}
                className={styles.opcao}
                // mousedown antes do blur do campo, senão a lista fecha antes do clique.
                onMouseDown={(evento) => {
                  evento.preventDefault();
                  escolher(opcao);
                }}
              >
                <span>{opcao.nome}</span>
                <MembroStatusBadge status={opcao.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </FormField>
  );
}
