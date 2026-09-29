const STORAGE_KEY = 'churchhub.session';
const MILLISECONDS_PER_SECOND = 1000;

function isExpired(session) {
  return Date.now() >= session.expiresAt;
}

function isValidShape(session) {
  return typeof session?.token === 'string' && typeof session?.expiresAt === 'number';
}

export const sessionStore = {
  save(token, expiresInSeconds) {
    const session = { token, expiresAt: Date.now() + expiresInSeconds * MILLISECONDS_PER_SECOND };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Sem armazenamento disponível (ex.: navegação privada): a sessão vale só nesta aba.
    }
    return session;
  },

  read() {
    try {
      const session = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!isValidShape(session) || isExpired(session)) {
        this.clear();
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nada a limpar.
    }
  },
};
