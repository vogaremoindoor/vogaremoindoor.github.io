// Diálogo de confirmação próprio: window.confirm é bloqueado em páginas dentro de quadros isolados.
export default function Confirmacao({ texto, confirmar, cancelar, onConfirmar, onCancelar }) {
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={texto}>
      <div className="modal-caixa">
        <p>{texto}</p>
        <div className="modal-botoes">
          <button type="button" className="btn btn-contorno" onClick={onCancelar} autoFocus>
            {cancelar}
          </button>
          <button type="button" className="btn btn-verde" onClick={onConfirmar}>
            {confirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
