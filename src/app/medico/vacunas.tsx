/**
 * Vacunas (Etapa 5): estado del calendario y pacientes con dosis atrasadas o sin esquema.
 * El calendario es un borrador hasta que el Dr. lo verifica (prompt maestro 7.8). Esa marca se va a
 * mover a Configuración en la Etapa 7.
 */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ESTADO_CALENDARIO, estadoDosis } from '@shared/vacunas';
import { useApp } from '@/data/store';
import { nombreCompleto } from '@/data/selectores';
import { hoyISO } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { Titulo, Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { Tarjeta } from '@/components/Tarjeta';
import { Boton } from '@/components/Boton';
import { Aviso } from '@/components/Formulario';
import { Caja, Grilla } from '@/components/Caja';
import { DialogoConfirmar } from '@/components/Estados';
import { AVISO_CALENDARIO } from '@/components/ficha/Vacunas';
import { colors } from '@/theme';

export default function Vacunas() {
  const { db, operaciones } = useApp();
  const hoy = hoyISO();
  const [preguntar, setPreguntar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verificado = db.vacunas.calendarioVerificado;
  const pacientes = db.patients.filter((p) => !p.archivedAt);
  const conAtrasadas = pacientes
    .map((p) => ({ p, n: db.vaccineDoses.filter((d) => d.patientId === p.id && !d.archivedAt && estadoDosis(d, hoy) === 'atrasada').length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  const sinEsquema = pacientes.filter((p) => !db.vaccineDoses.some((d) => d.patientId === p.id && d.source === 'calendario'));
  const ficha = (id: string) => router.push({ pathname: '/medico/hijo/[id]', params: { id, solapa: 'vacunas' } });

  const cambiar = async (v: boolean) => {
    setPreguntar(false);
    setError(await operaciones.verificarCalendario(v));
  };

  return (
    <Pantalla ancho>
      <Titulo>Vacunas</Titulo>
      <Tarjeta style={{ gap: 10 }}>
        <View style={s.fila}>
          <Ionicons name={verificado ? 'checkmark-circle' : 'alert-circle-outline'} size={24} color={verificado ? colors.contacto : colors.primary2} />
          <TextoFuerte style={{ flex: 1 }}>{verificado ? 'Calendario verificado' : 'Calendario sin verificar'}</TextoFuerte>
        </View>
        {!verificado ? <Aviso texto={AVISO_CALENDARIO} /> : null}
        <TextoChico>Archivo: {ESTADO_CALENDARIO}</TextoChico>
        {verificado
          ? <Boton titulo="Volver a marcarlo como borrador" variante="contorno" compacto onPress={() => cambiar(false)} />
          : <Boton titulo="Ya lo verifiqué" icono="checkmark" compacto onPress={() => setPreguntar(true)} />}
        {error ? <Aviso tono="alerta" texto={error} /> : null}
      </Tarjeta>

      <Grilla>
        <Caja titulo={`Con dosis atrasadas (${conAtrasadas.length})`} icono="alert-circle-outline" color="rosado">
          {conAtrasadas.length === 0 ? <Texto color={colors.textMuted}>Ningún paciente con dosis atrasadas.</Texto> : null}
          {conAtrasadas.map(({ p, n }) => (
            <Tarjeta key={p.id} onPress={() => ficha(p.id)} accessibilityLabel={`Vacunas de ${nombreCompleto(p)}`}>
              <TextoFuerte>{nombreCompleto(p)}</TextoFuerte>
              <TextoChico color={colors.alert}>{n} {n === 1 ? 'dosis atrasada' : 'dosis atrasadas'}</TextoChico>
            </Tarjeta>
          ))}
        </Caja>
        <Caja titulo={`Sin esquema armado (${sinEsquema.length})`} icono="shield-outline" color="celeste">
          {sinEsquema.length === 0 ? <Texto color={colors.textMuted}>Todos tienen el esquema armado.</Texto> : null}
          {sinEsquema.slice(0, 30).map((p) => (
            <Tarjeta key={p.id} onPress={() => ficha(p.id)} accessibilityLabel={`Armar el esquema de ${nombreCompleto(p)}`}>
              <TextoFuerte>{nombreCompleto(p)}</TextoFuerte>
              <TextoChico>Abrí la ficha y tocá “Generar esquema”.</TextoChico>
            </Tarjeta>
          ))}
          {sinEsquema.length > 30 ? <TextoChico>Y {sinEsquema.length - 30} más.</TextoChico> : null}
        </Caja>
      </Grilla>

      <DialogoConfirmar
        visible={preguntar}
        titulo="¿Verificaste el calendario?"
        texto="Confirmá que lo revisaste contra el Calendario Nacional de Vacunación vigente. Al marcarlo deja de mostrarse como borrador y, cuando Make esté conectado, salen los recordatorios a las familias."
        confirmar="Sí, lo verifiqué"
        onCancelar={() => setPreguntar(false)}
        onConfirmar={() => cambiar(true)}
      />
    </Pantalla>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
