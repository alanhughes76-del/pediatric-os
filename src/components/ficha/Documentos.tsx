/**
 * Certificados y documentos del paciente (prompt maestro 7.11). Los archivos viven en Cloud
 * Storage y se leen con la sesión del médico: nunca hay enlaces públicos. Cada documento dice
 * su tipo, su fecha y quién lo cargó. La familia no los ve en el portal (decisión del Dr., 17/10/2026).
 */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/data/store';
import type { Document, DocumentKind } from '@/data/types';
import { aCampos, ahoraISO, deFecha, fechaCorta } from '@/lib/fechas';
import { Seccion } from '../Seccion';
import { Tarjeta } from '../Tarjeta';
import { Etiqueta } from '../Etiqueta';
import { Boton } from '../Boton';
import { Campo, Opciones, Aviso } from '../Formulario';
import { Texto, TextoFuerte, TextoChico } from '../Texto';
import { BotonTexto } from './piezas';
import { ListaCertificados } from '../certificados/ListaCertificados';
import { useAbrirDocumento, useSubirDocumento } from '../documentos/Adjuntos';
import { colors } from '@/theme';

export const TEXTO_TIPO_DOCUMENTO: Record<DocumentKind, string> = { certificado: 'Certificado', receta: 'Receta', estudio: 'Estudio', otro: 'Otro' };
const ORIGEN: Record<NonNullable<Document['origin']>, string> = { medico: 'Lo cargaste vos', familia: 'Lo cargó la familia', sistema: 'Generado al emitir' };
const TIPOS: { valor: DocumentKind; texto: string }[] = [
  { valor: 'otro', texto: 'Otro' },
  { valor: 'estudio', texto: 'Estudio' },
  { valor: 'receta', texto: 'Receta' },
  { valor: 'certificado', texto: 'Certificado externo' },
];

export const tipoDeDocumento = (d: Document): DocumentKind => d.kind ?? (d.certificateId ? 'certificado' : 'otro');

export function BloqueDocumentos({ patientId }: { patientId: string }) {
  const { db } = useApp();
  const { abrir, error } = useAbrirDocumento();
  const { subir, subiendo, mensaje } = useSubirDocumento();
  const documentos = db.documents.filter((d) => d.patientId === patientId && !d.archivedAt).sort((a, b) => b.date.localeCompare(a.date));
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<DocumentKind>('otro');
  const [fecha, setFecha] = useState(aCampos(ahoraISO()).fecha);
  const [problema, setProblema] = useState<string | null>(null);

  const elegirYSubir = async () => {
    const f = deFecha(fecha);
    if (!titulo.trim()) return setProblema('Escribí un título.');
    if (!f) return setProblema('Revisá la fecha (dd/mm/aaaa).');
    setProblema(null);
    const ok = await subir({ patientId, title: titulo.trim(), kind: tipo, date: f, visibleToFamily: false });
    if (ok) { setAbierto(false); setTitulo(''); }
  };

  return (
    <>
      <Seccion titulo="Certificados">
        <Boton titulo="+ Emitir certificado" variante="secundario" onPress={() => router.push({ pathname: '/medico/certificado/nuevo', params: { paciente: patientId } })} />
        <ListaCertificados patientId={patientId} vista="medico" />
      </Seccion>

      <Seccion titulo="Documentos" bajada="PDF o imágenes, guardados sin enlaces públicos">
        {documentos.length === 0 ? <Texto color={colors.textMuted}>Sin documentos.</Texto> : null}
        {documentos.map((d) => (
          <Tarjeta key={d.id} style={{ gap: 6 }}>
            <View style={s.fila}>
              <TextoFuerte style={{ flex: 1 }}>{d.title}</TextoFuerte>
              <Etiqueta texto={TEXTO_TIPO_DOCUMENTO[tipoDeDocumento(d)]} tono="neutro" />
            </View>
            <TextoChico>{fechaCorta(d.date)}{d.origin ? ` · ${ORIGEN[d.origin]}` : ''}{!d.file ? ' · sin archivo (ejemplo)' : ''}</TextoChico>
            <View style={s.acciones}><BotonTexto texto="Ver" onPress={() => void abrir(d)} /></View>
          </Tarjeta>
        ))}
        {error ? <Aviso tono="alerta" texto={error} /> : null}
        {mensaje ? <Aviso tono={mensaje.tono} texto={mensaje.texto} /> : null}

        {!abierto ? (
          <Boton titulo="+ Subir documento" variante="secundario" onPress={() => setAbierto(true)} />
        ) : (
          <Tarjeta style={{ gap: 14, borderColor: colors.primary3 }}>
            <Campo etiqueta="Título" value={titulo} onChangeText={setTitulo} placeholder="Informe de ecografía, epicrisis…" />
            <Opciones etiqueta="Tipo" opciones={TIPOS} valor={tipo} onCambio={setTipo} />
            <Campo etiqueta="Fecha" value={fecha} onChangeText={setFecha} placeholder="dd/mm/aaaa" keyboardType="numbers-and-punctuation" />
            {problema ? <TextoChico color={colors.alert}>{problema}</TextoChico> : null}
            <Boton titulo={subiendo ? 'Subiendo…' : 'Elegir el archivo y subir'} icono="cloud-upload-outline" deshabilitado={subiendo} onPress={() => void elegirYSubir()} />
            <Boton titulo="Cancelar" variante="contorno" onPress={() => { setAbierto(false); setProblema(null); }} />
            <TextoChico>PDF o imagen (PNG, JPG, HEIC, WEBP), hasta 20 MB.</TextoChico>
          </Tarjeta>
        )}
      </Seccion>
    </>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 4 },
});
