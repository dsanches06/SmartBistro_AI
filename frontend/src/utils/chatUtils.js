/**
 * Utilitários para o componente de chat.
 * Contém funções auxiliares para agrupar conversas, formatar datas e criar mensagens de boas-vindas.
 */

/**
 * Agrupa conversas por data, organizando-as em categorias como Hoje, Ontem, Esta Semana e Anteriores.
 * @param {Array} conversations - Lista de conversas a serem agrupadas.
 * @returns {Array} Array de objetos com label e convs (conversas agrupadas).
 */
export const groupConversationsByDate = (conversations) => {
  // Ordena da mais recente para a mais antiga
  const sorted = [...conversations].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const week = new Date(today);
  week.setDate(week.getDate() - 7);
  // Grupos temporais para o histórico de conversas
  const groups = { Hoje: [], Ontem: [], "Esta Semana": [], Anteriores: [] };
  sorted.forEach((conv) => {
    const d = new Date(conv.created_at);
    if (d >= today) groups["Hoje"].push(conv);
    else if (d >= yesterday) groups["Ontem"].push(conv);
    else if (d >= week) groups["Esta Semana"].push(conv);
    else groups["Anteriores"].push(conv);
  });
  // Remove grupos vazios antes de devolver
  return Object.entries(groups)
    .filter(([, c]) => c.length > 0)
    .map(([label, convs]) => ({ label, convs }));
};

/**
 * Formata uma data para o formato português (pt-PT), incluindo dia, mês, hora e minuto.
 * @param {string|Date} dateString - String ou objeto Date a ser formatado.
 * @returns {string} Data formatada ou string vazia em caso de erro.
 */
export const formatConversationDate = (dateString) => {
  try {
    return new Date(dateString).toLocaleString("pt-PT", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

/** Cores por status de tarefa — alinhadas com STATUS_COLOR em userUtils */
export const TASK_STATUS_COLORS = {
  CREATED:     '#185FA5',
  ASSIGNED:    '#1D9E75',
  IN_PROGRESS: '#BA7517',
  BLOCKED:     '#A32D2D',
  COMPLETED:   '#3B6D11',
  ARCHIVED:    '#5F5E5A',
};

/** Devolve a cor correspondente à severidade (1-10) de um ticket */
export function getSeverityColor(sev) {
  if (sev >= 8) return '#DC2626';
  if (sev >= 5) return '#D97706';
  if (sev >= 3) return '#2563EB';
  return '#16A34A';
}

/**
 * Cria a mensagem de boas-vindas inicial do chat.
 * @returns {Object} Objeto da mensagem de boas-vindas.
 */
export const createWelcomeMessage = () => ({
  id: "welcome",
  text: "🍽️ Olá! Sou o Assistente do SmartBistro!\n\nPosso ajudar-te a:\n• Consultar mesas e fazer pedidos\n• Verificar o estado das encomendas\n• Gerir o menu e o stock\n• Analisar vendas e facturação\n\nComo posso ajudar-te hoje?",
  sender: "bot",
  timestamp: new Date(),
});
