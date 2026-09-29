// mapper/CategoriaFinanceiraMapper.java
package br.com.churchhub.api.mapper;

import br.com.churchhub.api.dto.CategoriaFinanceiraRequest;
import br.com.churchhub.api.dto.CategoriaFinanceiraResponse;
import br.com.churchhub.api.entity.CategoriaFinanceira;
import org.springframework.stereotype.Component;

@Component
public class CategoriaFinanceiraMapper {

    public CategoriaFinanceira toEntity(CategoriaFinanceiraRequest request) {
        CategoriaFinanceira categoria = new CategoriaFinanceira();
        categoria.setNome(request.nome());
        categoria.setTipo(request.tipo());
        return categoria;
    }

    public CategoriaFinanceiraResponse toResponse(CategoriaFinanceira categoria) {
        return new CategoriaFinanceiraResponse(categoria.getId(), categoria.getNome(), categoria.getTipo());
    }
}