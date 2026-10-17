/**
 * Adjuntos del paciente: subir un archivo (PDF o imagen) y verlo. Lo usan Documentos, las
 * prescripciones (PDF de la receta) y los estudios (resultado). Nunca hay enlaces públicos:
 * el archivo se lee con la sesión del médico.
 */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import type { DatosDocumento } from '@/data/contrato';
import type { Document } from '@/data/types';
import { elegirArchivo } from '@/lib/archivos';
import { fechaCorta } from '@/lib/fechas';
import { Aviso } from '../Formulario';
import { TextoChico } from '../Texto';
import { BotonTexto } from '../ficha/piezas';
import { colors } from '@/theme';

/** Subir: elige el archivo y lo guarda como documento del paciente. */
export function useSubirDocumento() {
  const { archivos } = useApp();
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState<{ tono: 'info' | 'alerta'; texto: string } | null>(null);
  const subir = async (datos: DatosDocumento) => {
    setMensaje(null);
    const archivo = await elegirArchivo();
    if (!archivo) return false;
    setSubiendo(true);
    const error = await archivos.subirDocumento(datos, archivo);
    setSubiendo(false);
    setMensaje(error ? { tono: 'alerta', texto: error } : { tono: 'info', texto: `Listo: "${archivo.name}" quedó guardado.` });
    return !error;
  };
  return { subir, subiendo, mensaje };
}

/** "Ver" un documento guardado. */
export function useAbrirDocumento() {
  const { archivos } = useApp();
  const [error, setError] = useState<string | null>(null);
  const abrir = async (d: Document) => { setError(await archivos.abrirDocumento(d)); };
  return { abrir, error };
}

/** Botón "Adjuntar…" con su estado. */
export function BotonAdjuntar({ titulo, datos }: { titulo: string; datos: DatosDocumento }) {
  const { subir, subiendo, mensaje } = useSubirDocumento();
  return (
    <View style={{ gap: 6 }}>
      <BotonTexto texto={subiendo ? 'Subiendo…' : titulo} onPress={() => { if (!subiendo) void subir(datos); }} />
      {mensaje ? <Aviso tono={mensaje.tono} texto={mensaje.texto} /> : null}
    </View>
  );
}

/** Lista corta de adjuntos con "Ver". */
export function ListaAdjuntos({ documentos }: { documentos: Document[] }) {
  const { abrir, error } = useAbrirDocumento();
  if (documentos.length === 0) return null;
  return (
    <View style={s.lista}>
      {documentos.map((d) => (
        <View key={d.id} style={s.fila}>
          <Ionicons name="attach-outline" size={18} color={colors.primary2} />
          <TextoChico style={{ flex: 1 }}>{d.title} · {fechaCorta(d.date)}</TextoChico>
          <BotonTexto texto="Ver" onPress={() => void abrir(d)} />
        </View>
      ))}
      {error ? <Aviso tono="alerta" texto={error} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  lista: { gap: 2 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
