import { Alert } from './Alert';
import { Button } from './Button';
import { Modal } from './Modal';
import styles from './ConfirmDialog.module.css';

/** Confirmação de ação destrutiva. O foco inicial fica em "Cancelar", a opção segura. */
export function ConfirmDialog({ aberto, titulo, rotuloConfirmar, processando = false, erro, onConfirmar, onCancelar, children }) {
  return (
    <Modal
      aberto={aberto}
      titulo={titulo}
      tamanho="pequeno"
      onFechar={onCancelar}
      podeFechar={!processando}
      rodape={
        <>
          <Button variante="secundario" onClick={onCancelar} disabled={processando} data-autofocus>
            Cancelar
          </Button>
          <Button variante="perigo" onClick={onConfirmar} carregando={processando}>
            {rotuloConfirmar}
          </Button>
        </>
      }
    >
      {erro && <Alert className={styles.erro}>{erro}</Alert>}
      {children}
    </Modal>
  );
}
