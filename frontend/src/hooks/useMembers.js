import { useCallback, useEffect, useState } from 'react';
import { memberService } from '../services/members';

export function useMembers({ page, size, search }) {
  const [state, setState] = useState({ data: null, isLoading: true, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCurrentRequest = true;
    setState((current) => ({ ...current, isLoading: true, error: null }));

    memberService
      .list({ page, size, search })
      .then((data) => isCurrentRequest && setState({ data, isLoading: false, error: null }))
      .catch((error) => isCurrentRequest && setState((current) => ({ ...current, isLoading: false, error })));

    return () => {
      isCurrentRequest = false;
    };
  }, [page, size, search, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return { ...state, reload };
}
