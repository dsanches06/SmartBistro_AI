/**
 * Factory que cria um middleware de verificação de existência de recurso.
 *
 * @param {Function} findById   - Função de serviço que recebe (id) e devolve o recurso ou null
 * @param {string}   entityName - Nome legível do recurso (ex: "Pedido", "Mesa")
 * @param {string}   [reqKey]   - Chave em req onde o recurso é guardado (default: inferido do entityName)
 *
 * @example
 * export const checkOrderExists = createExistsMiddleware(getOrderById, "Pedido", "order");
 */
export function createExistsMiddleware(findById, entityName, reqKey) {
  const key = reqKey || entityName.toLowerCase();

  return async (req, res, next) => {
    if (!req.params.id) return next();

    try {
      const resource = await findById(Number(req.params.id));

      if (!resource) {
        return res.status(404).json({ error: `${entityName} não encontrado` });
      }

      req[key] = resource;
      next();
    } catch (error) {
      console.error(`[${entityName}Middleware] ID ${req.params.id}:`, error.message);
      return res.status(500).json({ error: `Erro ao verificar ${entityName.toLowerCase()}` });
    }
  };
}
