/**
 * Ficha de la familia (prompt maestro 7.3): hijos, adultos responsables, próximos turnos,
 * historial de visitas, membresía y pagos, quién puede entrar al portal y registro de accesos.
 */
import { View, StyleSheet } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { fiebreDe, membresiaDeFamilia, nombreCompleto, sinRevisar, TEXTO_VISITA } from '@/data/selectores';
import { telefonoLegible } from '@shared/telefono';
import { edades } from '@/lib/edad';
import { fechaCorta, hora, hoyISO } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { Titulo, Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { Tarjeta } from '@/components/Tarjeta';
import { Etiqueta } from '@/components/Etiqueta';
import { Boton } from '@/components/Boton';
import { Avatar } from '@/components/Avatar';
import { Caja, Grilla } from '@/components/Caja';
import { Interruptor } from '@/components/Formulario';
import { EstadoVacio } from '@/components/Estados';
import { TEXTO_PREFERENCIA } from '@/components/ficha/piezas';
import { colors } from '@/theme';

export default function FichaFamilia() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, actualizar } = useApp();
  const familia = db.families.find((f) => f.id === id);
  if (!familia) {
    return <Pantalla><EstadoVacio icono="help-circle-outline" titulo="No encontramos esta familia" accion={<Boton titulo="Ver familias" onPress={() => router.navigate('/medico/familias')} />} /></Pantalla>;
  }

  const adultos = db.guardians.filter((g) => g.familyId === familia.id && !g.archivedAt);
  const hijos = db.patients.filter((p) => p.familyId === familia.id && !p.archivedAt);
  const idsHijos = new Set(hijos.map((h) => h.id));
  const nombreHijo = (pid: string) => hijos.find((h) => h.id === pid)?.firstName ?? '';
  const hoy = hoyISO();
  const consultas = db.consultations.filter((c) => idsHijos.has(c.patientId) && !c.archivedAt);
  const proximos = consultas.filter((c) => c.status === 'programada' && c.occurredAt.slice(0, 10) >= hoy).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const historial = consultas.filter((c) => c.status === 'realizada').sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 8);
  const { membership, estado } = membresiaDeFamilia(db, familia.id);
  const pagos = membership ? db.payments.filter((p) => p.membershipId === membership.id).sort((a, b) => b.date.localeCompare(a.date)) : [];
  const idsAdultos = new Set(adultos.map((g) => g.id));
  const accesos = db.auditLog.filter((a) => a.action === 'login' && idsAdultos.has(a.actorId)).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);
  const activa = familia.status !== 'inactiva';

  return (
    <Pantalla ancho>
      <Stack.Screen options={{ title: familia.name }} />
      <Tarjeta style={s.cabecera}>
        <View style={{ flex: 1, minWidth: 240, gap: 6 }}>
          <Titulo>{familia.name}</Titulo>
          <View style={s.etiquetas}>
            <Etiqueta texto={familia.zone ?? 'Zona sin cargar'} tono={familia.zone ? 'celeste' : 'neutro'} />
            {estado === 'activa' ? <Etiqueta texto="Membresía activa" tono="verde" /> : null}
            {estado === 'por-vencer' ? <Etiqueta texto="Membresía por renovar" tono="naranja" /> : null}
            {estado === 'vencida' ? <Etiqueta texto="Membresía vencida" tono="alerta" /> : null}
            {estado === 'sin-membresia' ? <Etiqueta texto="Sin membresía" tono="neutro" /> : null}
          </View>
        </View>
        <View style={{ minWidth: 220 }}>
          <Interruptor texto={activa ? 'Familia activa' : 'Familia inactiva'} activo={activa}
            onCambio={(v) => actualizar('families', familia.id, { status: v ? 'activa' : 'inactiva' }, v ? 'familia.activar' : 'familia.desactivar')} />
        </View>
      </Tarjeta>

      <Grilla>
        <Caja titulo="Hijos" icono="happy-outline" color="celeste">
          {hijos.length === 0 ? <Texto color={colors.textMuted}>Todavía no hay hijos cargados.</Texto> : null}
          {hijos.map((h) => {
            const fiebre = fiebreDe(db, h.id).filter(sinRevisar).length;
            return (
              <Tarjeta key={h.id} onPress={() => router.push(`/medico/hijo/${h.id}`)} accessibilityLabel={`Abrir la ficha de ${h.firstName}`} style={s.fila}>
                <Avatar paciente={h} tamano={40} />
                <View style={{ flex: 1 }}>
                  <TextoFuerte>{nombreCompleto(h)}</TextoFuerte>
                  <TextoChico>{edades(h, undefined, 'abreviado').cronologica}{fiebre > 0 ? ` · ${fiebre} de fiebre sin revisar` : ''}</TextoChico>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.primary3} />
              </Tarjeta>
            );
          })}
          <Boton titulo="+ Nuevo paciente en esta familia" variante="secundario" compacto onPress={() => router.push({ pathname: '/medico/paciente/nuevo', params: { familia: familia.id } })} />
        </Caja>

        <Caja titulo="Adultos responsables" icono="people-outline" color="celeste">
          {adultos.length === 0 ? <Texto color={colors.textMuted}>Sin adultos cargados.</Texto> : null}
          {adultos.map((g) => (
            <Tarjeta key={g.id} onPress={() => router.push(`/medico/adulto/${g.id}`)} accessibilityLabel={`Abrir la ficha de ${g.firstName}`} style={s.fila}>
              <View style={{ flex: 1, gap: 2 }}>
                <TextoFuerte>{g.firstName} {g.lastName}</TextoFuerte>
                <TextoChico>
                  {[g.email || 'Sin email', g.phone ? telefonoLegible(g.phone) : null, g.contactPreference ? `prefiere ${TEXTO_PREFERENCIA[g.contactPreference]}` : null].filter(Boolean).join(' · ')}
                </TextoChico>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.primary3} />
            </Tarjeta>
          ))}
        </Caja>

        <Caja titulo="Quién puede entrar al portal" icono="key-outline" color="verde">
          {adultos.map((g) => (
            <View key={g.id} style={s.filaSimple}>
              <Ionicons name={g.accessEnabled ? 'checkmark-circle' : 'remove-circle-outline'} size={20} color={g.accessEnabled ? colors.contacto : colors.textMuted} />
              <Texto style={{ flex: 1 }}>{g.firstName} {g.lastName}</Texto>
              <TextoChico>{g.accessEnabled ? 'Habilitado' : g.email ? 'Sin acceso' : 'Sin email'}</TextoChico>
            </View>
          ))}
          <TextoChico>Se habilita o deshabilita desde la ficha de cada adulto.</TextoChico>
        </Caja>

        <Caja titulo="Próximos turnos" icono="calendar-outline" color="celeste">
          {proximos.length === 0 ? <Texto color={colors.textMuted}>No hay turnos programados.</Texto> : null}
          {proximos.map((c) => (
            <View key={c.id} style={s.filaSimple}>
              <TextoFuerte>{fechaCorta(c.occurredAt)} {hora(c.occurredAt)}</TextoFuerte>
              <Texto style={{ flex: 1 }}>{TEXTO_VISITA[c.visitType]} · {nombreHijo(c.patientId)}</Texto>
            </View>
          ))}
          <TextoChico>La agenda completa llega en la Etapa 3.</TextoChico>
        </Caja>

        <Caja titulo="Historial de visitas" icono="time-outline" color="celeste">
          {historial.length === 0 ? <Texto color={colors.textMuted}>Todavía no hay visitas.</Texto> : null}
          {historial.map((c) => (
            <Tarjeta key={c.id} onPress={() => router.push(`/medico/consulta/${c.id}`)} accessibilityLabel={`Abrir la consulta del ${fechaCorta(c.occurredAt)}`} style={s.fila}>
              <View style={{ flex: 1 }}>
                <TextoFuerte>{fechaCorta(c.occurredAt)} · {nombreHijo(c.patientId)}</TextoFuerte>
                <TextoChico>{TEXTO_VISITA[c.visitType]}</TextoChico>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.primary3} />
            </Tarjeta>
          ))}
        </Caja>

        <Caja titulo="Membresía y pagos" icono="wallet-outline" color="verde">
          {!membership ? <Texto color={colors.textMuted}>Esta familia no tiene membresía.</Texto> : (
            <>
              <Texto>Plan {membership.plan} · desde {fechaCorta(membership.startDate)} · renueva el {fechaCorta(membership.renewalDate)}</Texto>
              <TextoChico>Hijos incluidos: {membership.patientIds.map(nombreHijo).filter(Boolean).join(', ') || '—'}</TextoChico>
              {pagos.length === 0 ? <TextoChico>Sin pagos registrados.</TextoChico> : null}
              {pagos.map((p) => (
                <View key={p.id} style={s.filaSimple}>
                  <Texto style={{ flex: 1 }}>{fechaCorta(p.date)} · {p.method}</Texto>
                  <TextoFuerte>{p.currency} {p.amount.toLocaleString('es-AR')}</TextoFuerte>
                </View>
              ))}
            </>
          )}
          <TextoChico>La gestión de membresías y pagos llega en la Etapa 7.</TextoChico>
        </Caja>

        <Caja titulo="Registro de accesos" icono="log-in-outline" color="celeste" ver={{ texto: 'Ver el registro completo', onPress: () => router.push('/medico/accesos') }}>
          {accesos.length === 0 ? <Texto color={colors.textMuted}>Nadie de esta familia entró al portal todavía.</Texto> : null}
          {accesos.map((a) => {
            const g = adultos.find((x) => x.id === a.actorId);
            return <TextoChico key={a.id}>{fechaCorta(a.at)} {hora(a.at)} · {g?.firstName} {g?.lastName}</TextoChico>;
          })}
        </Caja>
      </Grilla>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  cabecera: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, padding: 22 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, boxShadow: 'none' },
  filaSimple: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
