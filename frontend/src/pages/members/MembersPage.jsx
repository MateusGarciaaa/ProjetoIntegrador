import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { Spinner } from '../../components/ui/Spinner';
import { MemberForm } from '../../components/members/MemberForm';
import { MemberTable } from '../../components/members/MemberTable';
import { useAuth } from '../../hooks/useAuth';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useMembers } from '../../hooks/useMembers';
import { useMemberMutations } from './useMemberMutations';
import { PERMISSIONS } from '../../constants/permissions';
import styles from './MembersPage.module.css';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;

export function MembersPage() {
  const { can } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const { data, isLoading, error, reload } = useMembers({ page, size: PAGE_SIZE, search: debouncedSearch });

  const members = data?.content ?? [];
  const isLastItemOnPage = members.length === 1 && page > 0;
  const mutations = useMemberMutations({
    onChanged: reload,
    onDeleted: () => (isLastItemOnPage ? setPage(page - 1) : reload()),
  });

  function handleSearchChange(event) {
    setSearch(event.target.value);
    setPage(0);
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Membros</h1>
          {data && <p className={styles.count}>{formatMemberCount(data.totalElements)}</p>}
        </div>
        {can(PERMISSIONS.MEMBERS_CREATE) && (
          <Button icon="plus" onClick={mutations.openCreate}>
            Novo membro
          </Button>
        )}
      </header>

      <div className={styles.panel}>
        <div className={styles.toolbar}>
          <label className={styles.search}>
            <Icon name="search" />
            <span className={styles.visuallyHidden}>Buscar membros</span>
            <input
              type="search"
              value={search}
              onChange={handleSearchChange}
              placeholder="Buscar por nome, e-mail ou CPF"
              className={styles.searchInput}
            />
          </label>
          {isLoading && data && <Spinner label="Atualizando" />}
        </div>

        <MembersContent
          data={data}
          error={error}
          search={debouncedSearch}
          onRetry={reload}
          onCreate={can(PERMISSIONS.MEMBERS_CREATE) ? mutations.openCreate : null}
          tableProps={{
            members,
            canEdit: can(PERMISSIONS.MEMBERS_UPDATE),
            canDelete: can(PERMISSIONS.MEMBERS_DELETE),
            onEdit: mutations.openEdit,
            onDelete: mutations.askDelete,
          }}
        />

        {data && (
          <footer className={styles.footer}>
            <Pagination page={data.number} totalPages={data.totalPages} onPageChange={setPage} />
          </footer>
        )}
      </div>

      <Modal isOpen={mutations.editor.isOpen} title={mutations.editor.member ? 'Editar membro' : 'Novo membro'} onClose={mutations.closeEditor}>
        <MemberForm
          member={mutations.editor.member}
          submitLabel={mutations.editor.member ? 'Salvar alterações' : 'Cadastrar membro'}
          onSubmit={mutations.save}
          onCancel={mutations.closeEditor}
        />
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(mutations.memberToDelete)}
        title="Excluir membro"
        message={`${mutations.memberToDelete?.name ?? ''} será removido do cadastro. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir membro"
        isConfirming={mutations.isDeleting}
        onConfirm={mutations.confirmDelete}
        onCancel={mutations.cancelDelete}
      />
    </section>
  );
}

function MembersContent({ data, error, search, onRetry, onCreate, tableProps }) {
  if (error && !data) {
    return (
      <div className={styles.state} role="alert">
        <p>{error.message}</p>
        <Button variant="secondary" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.state}>
        <Spinner label="Carregando membros" />
      </div>
    );
  }

  if (tableProps.members.length === 0) {
    return <EmptyMembers search={search} onCreate={onCreate} />;
  }

  return <MemberTable {...tableProps} />;
}

function EmptyMembers({ search, onCreate }) {
  if (search) {
    return (
      <div className={styles.state}>
        <p>Nenhum membro encontrado para “{search}”. Confira a grafia ou busque por outro termo.</p>
      </div>
    );
  }

  return (
    <div className={styles.state}>
      <p>Nenhum membro cadastrado ainda.</p>
      {onCreate && (
        <Button icon="plus" onClick={onCreate}>
          Cadastrar primeiro membro
        </Button>
      )}
    </div>
  );
}

function formatMemberCount(total) {
  return total === 1 ? '1 membro cadastrado' : `${total} membros cadastrados`;
}
