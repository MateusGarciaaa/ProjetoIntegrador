import { useCallback, useState } from 'react';
import { memberService } from '../../services/members';
import { useToast } from '../../hooks/useToast';

const CLOSED_EDITOR = Object.freeze({ isOpen: false, member: null });

export function useMemberMutations({ onChanged, onDeleted }) {
  const toast = useToast();
  const [editor, setEditor] = useState(CLOSED_EDITOR);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openCreate = useCallback(() => setEditor({ isOpen: true, member: null }), []);
  const openEdit = useCallback((member) => setEditor({ isOpen: true, member }), []);
  const closeEditor = useCallback(() => setEditor(CLOSED_EDITOR), []);

  async function save(payload) {
    if (editor.member) {
      await memberService.update(editor.member.id, payload);
      toast.success('Alterações salvas.');
    } else {
      await memberService.create(payload);
      toast.success('Membro cadastrado.');
    }
    closeEditor();
    onChanged();
  }

  async function confirmDelete() {
    setIsDeleting(true);
    try {
      await memberService.remove(memberToDelete.id);
      toast.success('Membro excluído.');
      setMemberToDelete(null);
      onDeleted();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
    }
  }

  return {
    editor,
    openCreate,
    openEdit,
    closeEditor,
    save,
    memberToDelete,
    isDeleting,
    askDelete: setMemberToDelete,
    cancelDelete: () => setMemberToDelete(null),
    confirmDelete,
  };
}
