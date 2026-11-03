import { describe, expect, it } from 'vitest';
import {
  filtrosDoServicoUsuarios,
  lerConsultaUsuarios,
  parametrosDaConsultaUsuarios,
  temFiltroUsuarios,
} from './consultaUsuarios';

const ler = (texto) => lerConsultaUsuarios(new URLSearchParams(texto));

describe('consulta da lista de usuários na URL', () => {
  it('lê busca, perfil, situação e página (contada a partir de 1 na URL)', () => {
    expect(ler('busca=%20ana%20&perfil=PASTOR&situacao=inativos&pagina=3')).toEqual({
      nome: 'ana',
      perfil: 'PASTOR',
      situacao: 'inativos',
      pagina: 2,
    });
  });

  it('valores inválidos voltam ao padrão em vez de virar 400 no backend', () => {
    expect(ler('perfil=LIDER&situacao=todos&pagina=-1')).toEqual({ nome: '', perfil: '', situacao: '', pagina: 0 });
  });

  it('escreve só o que difere do padrão', () => {
    expect(parametrosDaConsultaUsuarios({ nome: '', perfil: '', situacao: '', pagina: 0 })).toEqual({});
    expect(parametrosDaConsultaUsuarios({ nome: ' ana ', perfil: 'MEMBRO', situacao: 'ativos', pagina: 1 })).toEqual({
      busca: 'ana',
      perfil: 'MEMBRO',
      situacao: 'ativos',
      pagina: '2',
    });
  });

  it('situação vira ativo=true|false para o GET /users; vazia não filtra', () => {
    expect(filtrosDoServicoUsuarios({ nome: '', perfil: '', situacao: 'ativos', pagina: 0 }).ativo).toBe(true);
    expect(filtrosDoServicoUsuarios({ nome: '', perfil: '', situacao: 'inativos', pagina: 0 }).ativo).toBe(false);
    expect(filtrosDoServicoUsuarios({ nome: '', perfil: '', situacao: '', pagina: 0 }).ativo).toBeUndefined();
  });

  it('sabe se há filtro ativo', () => {
    expect(temFiltroUsuarios({ nome: '', perfil: '', situacao: '' })).toBe(false);
    expect(temFiltroUsuarios({ nome: '', perfil: 'PASTOR', situacao: '' })).toBe(true);
  });
});
