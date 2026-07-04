// Envolve um handler assíncrono e converte qualquer erro não tratado numa resposta
// 500 uniforme, eliminando o try/catch repetido em cada controller simples.
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      res.status(500).json({ error: err.message });
    });
  };
}
