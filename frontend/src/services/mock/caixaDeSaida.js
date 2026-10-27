/**
 * Caixa de e-mail do backend simulado. Faz o papel do LoggingMailSender do backend real,
 * que só registra no log o link "/reset-password?token=…": aqui o link fica visível na
 * tela de "Esqueci minha senha", e só no modo simulado.
 */
const mensagens = [];
const ouvintes = new Set();

export function registrarEmail({ para, link }) {
  mensagens.unshift({ para, link });
  ouvintes.forEach((ouvinte) => ouvinte(listarEmails()));
}

export function listarEmails() {
  return [...mensagens];
}

export function observarEmails(ouvinte) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}
