// mapper/MembroMapper.java
package br.com.churchhub.api.mapper;

import br.com.churchhub.api.dto.MembroRequest;
import br.com.churchhub.api.dto.MembroResponse;
import br.com.churchhub.api.entity.Membro;
import br.com.churchhub.api.entity.StatusMembro;
import org.springframework.stereotype.Component;

@Component
public class MembroMapper {

    public Membro toEntity(MembroRequest request) {
        Membro membro = new Membro();
        applyRequest(membro, request);
        return membro;
    }

    public void updateEntity(Membro membro, MembroRequest request) {
        applyRequest(membro, request);
    }

    private void applyRequest(Membro membro, MembroRequest request) {
        membro.setNome(request.nome());
        membro.setCpf(request.cpf());
        membro.setEmail(request.email());
        membro.setTelefone(request.telefone());
        membro.setEndereco(request.endereco());
        membro.setDataNascimento(request.dataNascimento());
        membro.setDataBatismo(request.dataBatismo());
        membro.setDataConversao(request.dataConversao());
        membro.setStatus(request.status() != null ? request.status() : StatusMembro.ATIVO);
    }

    public MembroResponse toResponse(Membro membro) {
        return new MembroResponse(
                membro.getId(),
                membro.getNome(),
                membro.getCpf(),
                membro.getEmail(),
                membro.getTelefone(),
                membro.getEndereco(),
                membro.getDataNascimento(),
                membro.getDataBatismo(),
                membro.getDataConversao(),
                membro.getStatus()
        );
    }
}