/* Função para registrar logs das requisições */
export default function logger(req, res, next) {
  console.log(`${req.method} ${req.url}`);
  next();
}