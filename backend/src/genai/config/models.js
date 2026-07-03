// Modelo Claude usado por todos os agentes do SmartBistro AI.
// Configurável via CLAUDE_MODEL no .env — trocar de modelo não requer alterar código.
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-haiku-4-5";
