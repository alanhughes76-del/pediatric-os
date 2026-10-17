/**
 * Piezas comunes de las secciones de Configuración: guardar con un botón y avisar cómo salió.
 */
import { useState } from 'react';
import { View } from 'react-native';
import { useApp } from '@/data/store';
import type { Ajuste } from '@/data/contrato';
import { Boton } from '../Boton';
import { Aviso } from '../Formulario';

/** Guarda un ajuste. `validar` devuelve un mensaje si algo está mal (no se guarda). */
export function useGuardarAjuste() {
  const { operaciones } = useApp();
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tono: 'info' | 'alerta'; texto: string } | null>(null);
  const guardar = async (ajuste: Ajuste, error?: string) => {
    if (error) { setMensaje({ tono: 'alerta', texto: error }); return; }
    setGuardando(true);
    const e = await operaciones.guardarAjustes(ajuste);
    setGuardando(false);
    setMensaje(e ? { tono: 'alerta', texto: e } : { tono: 'info', texto: 'Guardado.' });
  };
  return { guardando, mensaje, guardar, limpiar: () => setMensaje(null) };
}

export function PieGuardar({ guardando, mensaje, onGuardar }: {
  guardando: boolean;
  mensaje: { tono: 'info' | 'alerta'; texto: string } | null;
  onGuardar: () => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      {mensaje ? <Aviso tono={mensaje.tono} texto={mensaje.texto} icono={mensaje.tono === 'info' ? 'checkmark-circle' : undefined} /> : null}
      <Boton titulo={guardando ? 'Guardando…' : 'Guardar'} icono="checkmark" compacto deshabilitado={guardando} onPress={onGuardar} />
    </View>
  );
}

export { aNumero } from '@/data/configuracion';
