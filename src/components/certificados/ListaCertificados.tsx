/**
 * Certificados de un paciente.
 * - Médico: ver o compartir el PDF y anular (con motivo; queda visible como "Anulado").
 * - Familia: descargar o compartir el PDF de los emitidos; los anulados se ven como "Anulado".
 * Al médico también le lista los otros documentos del paciente; la familia los ve (y baja) en "Documentos".
 */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { nombreCompleto, paciente as buscarPaciente } from '@/data/selectores';
import type { Certificate } from '@/data/types';
import { lugarYFecha, tipoCertificado } from '@/lib/certificados';
import { compartirCertificado } from '@/lib/certificadoPdf';
import { fechaCorta } from '@/lib/fechas';
import { Tarjeta } from '../Tarjeta';
import { Etiqueta } from '../Etiqueta';
import { Boton } from '../Boton';
import { Campo, Aviso } from '../Formulario';
import { Texto, TextoFuerte, TextoChico } from '../Texto';
import { BotonTexto } from '../ficha/piezas';
import { VistaCertificado } from './VistaCertificado';
import { colors } from '@/theme';

export function ListaCertificados({ patientId, vista }: { patientId: string; vista: 'medico' | 'familia' }) {
  const { db } = useApp();
  const certificados = db.certificates.filter((c) => c.patientId === patientId).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const otros = vista === 'familia' ? [] : db.documents.filter((d) => d.patientId === patientId && !d.certificateId && !d.archivedAt).sort((a, b) => b.date.localeCompare(a.date));

  if (certificados.length === 0 && otros.length === 0) {
    return <Texto color={colors.textMuted}>{vista === 'familia' ? 'Todavía no hay certificados.' : 'Sin certificados ni documentos.'}</Texto>;
  }
  return (
    <View style={{ gap: 10 }}>
      {certificados.map((c) => <ItemCertificado key={c.id} c={c} vista={vista} />)}
      {otros.map((d) => (
        <Tarjeta key={d.id} style={s.fila}>
          <Ionicons name="document-text-outline" size={24} color={colors.primary2} />
          <View style={{ flex: 1 }}>
            <TextoFuerte>{d.title}</TextoFuerte>
            <TextoChico>{fechaCorta(d.date)} · documento cargado</TextoChico>
          </View>
        </Tarjeta>
      ))}
    </View>
  );
}

function ItemCertificado({ c, vista }: { c: Certificate; vista: 'medico' | 'familia' }) {
  const { db, operaciones, archivos } = useApp();
  const p = buscarPaciente(db, c.patientId);
  // El PDF que se guardó al emitir (Firebase). Si no hay, se arma en el momento con el mismo texto.
  const guardado = db.documents.find((d) => d.id === c.documentId && d.file);
  const [ver, setVer] = useState(false);
  const [anulando, setAnulando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const anulado = c.status === 'anulado';
  const titulo = tipoCertificado(c.type).titulo;

  const anular = () => {
    if (!motivo.trim()) return setError('Escribí el motivo de la anulación.');
    operaciones.anularCertificado(c, motivo.trim()).then((e) => (e ? setError(e) : setAnulando(false)));
  };

  return (
    <Tarjeta style={[{ gap: 10 }, anulado && { opacity: 0.8 }]}>
      <View style={s.fila}>
        <Ionicons name="ribbon-outline" size={24} color={anulado ? colors.textMuted : colors.primary2} />
        <View style={{ flex: 1, gap: 4 }}>
          <TextoFuerte style={anulado ? { color: colors.textMuted, textDecorationLine: 'line-through' } : undefined}>{titulo}</TextoFuerte>
          <TextoChico>{fechaCorta(c.date)}{c.destination ? ` · para ${c.destination}` : ''}</TextoChico>
        </View>
        <Etiqueta texto={anulado ? 'Anulado' : 'Emitido'} tono={anulado ? 'alerta' : 'celeste'} />
      </View>
      {anulado && vista === 'medico' && c.voidReason ? <TextoChico color={colors.alert}>Motivo: {c.voidReason}</TextoChico> : null}

      {!anulado ? (
        <Boton
          compacto
          titulo={vista === 'familia' ? 'Descargar o compartir PDF' : 'Ver o compartir PDF'}
          variante="secundario"
          onPress={() => {
            if (vista === 'medico' && guardado) void archivos.abrirDocumento(guardado).then((e) => { if (e) setError(e); });
            else if (p) void compartirCertificado(c, nombreCompleto(p));
          }}
        />
      ) : null}
      {error && !anulando ? <TextoChico color={colors.alert}>{error}</TextoChico> : null}

      {vista === 'medico' ? (
        <View style={s.acciones}>
          <BotonTexto texto={ver ? 'Ocultar el texto' : 'Ver el texto'} onPress={() => setVer(!ver)} />
          {!anulado && !anulando ? <BotonTexto texto="Anular" tono="alerta" onPress={() => setAnulando(true)} /> : null}
        </View>
      ) : null}

      {ver ? <VistaCertificado titulo={titulo} cuerpo={c.body} lugarFecha={lugarYFecha(c.place, c.date)} firma={c.signature} anulado={anulado ? c.voidReason ?? true : undefined} /> : null}

      {anulando ? (
        <View style={{ gap: 8 }}>
          <Campo etiqueta="Motivo de la anulación" value={motivo} onChangeText={setMotivo} placeholder="Ej.: error en el nombre del colegio" error={error ?? undefined} />
          <Aviso texto="El certificado queda visible como «Anulado». Después podés emitir otro." />
          <Boton compacto titulo="Confirmar anulación" variante="alerta" onPress={anular} />
          <Boton compacto titulo="Cancelar" variante="contorno" onPress={() => { setAnulando(false); setError(null); }} />
        </View>
      ) : null}
    </Tarjeta>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 4 },
});
