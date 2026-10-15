import { useEffect } from "react";

/** Mantém a tela acesa enquanto `ativo` (Wake Lock API; precisa de HTTPS ou localhost). */
export function useWakeLock(ativo) {
  useEffect(() => {
    if (!ativo || !("wakeLock" in navigator)) return;
    let trava = null;
    let encerrado = false;
    const pedir = async () => {
      try {
        const t = await navigator.wakeLock.request("screen");
        if (encerrado) t.release().catch(() => {});
        else trava = t;
      } catch {
        /* sem suporte ou negado: segue sem manter a tela acesa */
      }
    };
    // O navegador solta a trava quando a aba fica oculta; pedimos de novo ao voltar.
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === "visible") pedir();
    };
    pedir();
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    return () => {
      encerrado = true;
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
      trava?.release().catch(() => {});
    };
  }, [ativo]);
}
