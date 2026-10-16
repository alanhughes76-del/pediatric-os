import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { visitasDelDia, alergiasDe, paciente, nombreCompleto, domicilioDe, textoDomicilio, TEXTO_VISITA, TEXTO_MODALIDAD, esUrgencia } from '@/data/selectores';
import { edades } from '@/lib/edad';
import { hoyISO, diaYFecha, hora } from '@/lib/fechas';
import { abrirEnGoogleMaps, abrirEnWaze } from '@/lib/mapas';
import { Pantalla } from '@/components/Pantalla';
import { Titulo, Subtitulo, Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { Tarjeta } from '@/components/Tarjeta';
import { Seccion } from '@/components/Seccion';
import { Boton } from '@/components/Boton';
import { Etiqueta } from '@/components/Etiqueta';
import { SeguimientosPendientes } from '@/components/SeguimientosPendientes';
import { colors } from '@/theme';

export default function Hoy() {
  const { db, actualizar } = useApp();
  const visitas = visitasDelDia(db);

  return (
    <Pantalla>
      <View>
        <TextoChico>{diaYFecha(hoyISO())}</TextoChico>
        <Titulo>{visitas.length === 0 ? 'Hoy no hay visitas' : `${visitas.length} ${visitas.length === 1 ? 'visita' : 'visitas'} hoy`}</Titulo>
      </View>

      <Seccion titulo="Seguimientos pendientes" bajada="Notas aprobadas con bandera clínica">
        <SeguimientosPendientes />
      </Seccion>

      <Seccion titulo="Visitas del día">
        {visitas.map((v) => {
          const p = paciente(db, v.patientId);
          if (!p) return null;
          const familia = db.families.find((f) => f.id === p.familyId);
          const domicilio = domicilioDe(db, v);
          const direccion = textoDomicilio(domicilio);
          const alergias = alergiasDe(db, p.id, 'medico').filter((a) => a.status === 'confirmada');
          return (
            <Tarjeta key={v.id} style={{ gap: 12 }}>
              <View style={s.filaEntre}>
                <Subtitulo>{hora(v.occurredAt)} h</Subtitulo>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {v.status === 'realizada' ? <Etiqueta texto="Atendida" tono="neutro" /> : null}
                  <Etiqueta texto={TEXTO_VISITA[v.visitType]} tono={esUrgencia(v.visitType) ? 'azul' : 'celeste'} />
                </View>
              </View>

              <View style={{ gap: 2 }}>
                <TextoFuerte style={{ fontSize: 21 }}>{nombreCompleto(p)}</TextoFuerte>
                <Texto color={colors.textMuted}>{edades(p, undefined, 'abreviado').cronologica}{familia ? ` · ${familia.name}` : ''}</Texto>
                {alergias.length > 0 ? (
                  <View style={{ marginTop: 4 }}>
                    <Etiqueta tono="alerta" texto={`Alergia: ${alergias.map((a) => a.allergen).join(', ')}`} />
                  </View>
                ) : null}
              </View>

              {v.modality === 'domicilio' ? (
                <>
                  <View style={s.fila}>
                    <Ionicons name="location-outline" size={22} color={colors.primary2} />
                    <View style={{ flex: 1 }}>
                      <Texto>{direccion}</Texto>
                      {domicilio?.notes ? <TextoChico>{domicilio.notes}</TextoChico> : null}
                    </View>
                  </View>
                  {domicilio ? (
                    <View style={s.botones}>
                      <View style={{ flex: 1 }}><Boton compacto titulo="Google Maps" variante="secundario" onPress={() => abrirEnGoogleMaps(direccion)} /></View>
                      <View style={{ flex: 1 }}><Boton compacto titulo="Waze" variante="secundario" onPress={() => abrirEnWaze(direccion)} /></View>
                    </View>
                  ) : null}
                </>
              ) : (
                <TextoChico>{TEXTO_MODALIDAD[v.modality]}</TextoChico>
              )}
              <Boton
                titulo="Abrir consulta"
                icono="create-outline"
                onPress={() => {
                  // Al abrirla, el turno pasa a ser una consulta realizada.
                  if (v.status === 'programada') actualizar('consultations', v.id, { status: 'realizada' }, 'consulta.abrir');
                  router.push(`/medico/consulta/${v.id}`);
                }}
              />
              <Boton titulo="Ver ficha" icono="document-text-outline" variante="contorno" onPress={() => router.push(`/medico/hijo/${p.id}`)} />
            </Tarjeta>
          );
        })}
      </Seccion>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  filaEntre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  botones: { flexDirection: 'row', gap: 10 },
});
