import { useEffect, useRef, useState } from 'react';

/**
 * Guarda solo: espera a que se deje de escribir (`ms`) y llama a `guardar`.
 * Si la pantalla se cierra con un cambio pendiente, lo guarda igual.
 */
export function useAutoguardado<T>(valor: T, guardar: (v: T) => void, ms = 700) {
  const [pendiente, setPendiente] = useState(false);
  const fn = useRef(guardar);
  useEffect(() => {
    fn.current = guardar;
  });
  const ultimo = useRef<{ v: T } | null>(null);
  const clave = JSON.stringify(valor);
  const inicial = useRef(clave);

  useEffect(() => {
    if (clave === inicial.current && !ultimo.current) return;
    ultimo.current = { v: valor };
    setPendiente(true);
    const t = setTimeout(() => {
      if (ultimo.current) fn.current(ultimo.current.v);
      ultimo.current = null;
      setPendiente(false);
    }, ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, ms]);

  useEffect(() => () => {
    if (ultimo.current) fn.current(ultimo.current.v);
  }, []);

  return pendiente;
}
