// mapper/MovimentacaoFinanceiraMapper.java
package br.com.churchhub.api.mapper;

import br.com.churchhub.api.dto.CategoriaFinanceiraResponse;
import br.com.churchhub.api.dto.MovimentacaoFinanceiraRequest;
import br.com.churchhub.api.dto.MovimentacaoFinanceiraResponse;
import br.com.churchhub.api.entity.CategoriaFinanceira;
import br.com.churchhub.api.entity.Membro;
import br.com.churchhub.api.entity.MovimentacaoFinanceira;
import org.springframework.stereotype.Component;

@Component
public class MovimentacaoFinanceiraMapper {

    public MovimentacaoFinanceira toEntity(MovimentacaoFinanceiraRequest request,
                                            CategoriaFinanceira categoria, Membro membro) {
        MovimentacaoFinanceira movimentacao = new MovimentacaoFinanceira();
        applyRequest(movimentacao, request, categoria, membro);
        return movimentacao;
    }

    public void updateEntity(MovimentacaoFinanceira movimentacao, MovimentacaoFinanceiraRequest request,
                              CategoriaFinanceira categoria, Membro membro) {
        applyRequest(movimentacao, request, categoria, membro);
    }

    private void applyRequest(MovimentacaoFinanceira movimentacao, MovimentacaoFinanceiraRequest request,
                               CategoriaFinanceira categoria, Membro membro) {
        movimentacao.setDescricao(request.descricao());
        movimentacao.setValor(request.valor());
        movimentacao.setData(request.data());
        movimentacao.setTipo(request.tipo());
        movimentacao.setCategoria(categoria);
        movimentacao.setMembro(membro);
    }

    public MovimentacaoFinanceiraResponse toResponse(MovimentacaoFinanceira movimentacao) {
        Membro membro = movimentacao.getMembro();
        CategoriaFinanceira categoria = movimentacao.getCategoria();

        return new MovimentacaoFinanceiraResponse(
                movimentacao.getId(),
                movimentacao.getDescricao(),
                movimentacao.getValor(),
                movimentacao.getData(),
                movimentacao.getTipo(),
                new CategoriaFinanceiraResponse(categoria.getId(), categoria.getNome(), categoria.getTipo()),
                membro != null ? membro.getId() : null,
                membro != null ? membro.getNome() : null
        );
    }
}