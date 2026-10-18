/**
 * La consulta: datos, antropometría con percentilos, hitos del desarrollo y nota clínica.
 * Todo se guarda solo (salvo la nota, que tiene sus propios botones).
 */
import { CampoFecha } from '@/components/CampoFecha';
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/data/store';
import { paciente as buscarPaciente, alergiasDe, adultosDe, domicilioDe, nombreCompleto, textoDomicilio, TEXTO_MODALIDAD, TEXTO_VISITA } from '@/data/selectores';
import type { Consultation, Modality, VisitType } from '@/data/types';
import { edades, textoEG } from '@/lib/edad';
import { aCampos, deCampos, diasEntre } from '@/lib/fechas';
import { useAutoguardado } from '@/lib/useAutoguardado';
import { Pantalla } from '@/components/Pantalla';
import { Titulo, Texto, TextoChico } from '@/components/Texto';
import { Tarjeta } from '@/components/Tarjeta';
import { Seccion } from '@/components/Seccion';
import { AlergiasDestacadas } from '@/components/Alergias';
import { Campo, Opciones, Aviso, EstadoGuardado } from '@/components/Formulario';
import { Antropometria } from '@/components/consulta/Antropometria';
import { Hitos } from '@/components/consulta/Hitos';
import { NotaClinica } from '@/components/consulta/NotaClinica';
import { ProblemasAbordados, TurnoDeOrigen } from '@/components/consulta/ProblemasAbordados';
import { colors } from '@/theme';

export default function ConsultaMedico() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db } = useApp();
  const consulta = db.consultations.find((c) => c.id === id);
  const p = consulta ? buscarPaciente(db, consulta.patientId) : undefined;
  if (!consulta || !p) return <Pantalla><Texto>No encontramos esta consulta.</Texto></Pantalla>;

  const fecha = consulta.occurredAt.slice(0, 10);
  const nacioDespues = diasEntre(p.birthDate, fecha) < 0;
  const e = nacioDespues ? null : edades(p, fecha, 'abreviado');

  return (
    <Pantalla>
      <Stack.Screen options={{ title: `Consulta · ${p.firstName}` }} />

      <View style={{ gap: 4 }}>
        <Titulo>{nombreCompleto(p)}</Titulo>
        {e ? (
          <Texto color={colors.primary2} style={{ fontSize: 20 }}>
            {e.cronologica}{e.corregida ? ` · corregida ${e.corregida}` : ''}
          </Texto>
        ) : null}
        <TextoChico>Edad gestacional al nacer: {textoEG(p)}</TextoChico>
      </View>
      {nacioDespues ? <Aviso tono="alerta" texto="La fecha de nacimiento es posterior a la de la consulta. Revisá las fechas antes de seguir." /> : null}
      <AlergiasDestacadas alergias={alergiasDe(db, p.id, 'medico')} />

      <Seccion titulo="Datos de la consulta">
        <Tarjeta style={{ gap: 8 }}>
          <DatosConsulta key={consulta.id} consulta={consulta} />
          <TurnoDeOrigen consulta={consulta} />
        </Tarjeta>
      </Seccion>

      <Seccion titulo="Problemas que se abordaron">
        <Tarjeta><ProblemasAbordados consulta={consulta} /></Tarjeta>
      </Seccion>

      <Seccion titulo="Antropometría" bajada="Percentilo y Z mientras escribís">
        <Tarjeta><Antropometria key={consulta.id} consulta={consulta} paciente={p} /></Tarjeta>
      </Seccion>

      <Seccion titulo="Hitos del desarrollo" bajada="CDC/AAP 2022">
        <Tarjeta><Hitos key={consulta.id} consulta={consulta} paciente={p} /></Tarjeta>
      </Seccion>

      <Seccion titulo="Nota clínica">
        <NotaClinica key={consulta.id} consulta={consulta} paciente={p} />
      </Seccion>
    </Pantalla>
  );
}

function DatosConsulta({ consulta }: { consulta: Consultation }) {
  const { db, actualizar } = useApp();
  // Domicilios de los adultos del paciente: la visita va al que corresponda.
  const domicilios = adultosDe(db, consulta.patientId).flatMap(({ guardian, domicilios: ds }) =>
    ds.map((a) => ({ valor: a.id, texto: textoDomicilio(a), detalle: `${guardian.firstName} ${guardian.lastName}` })));
  const domicilioActual = domicilioDe(db, consulta);
  const inicial = aCampos(consulta.occurredAt);
  const [fecha, setFecha] = useState(inicial.fecha);
  const [horaTxt, setHora] = useState(inicial.hora);
  const iso = deCampos(fecha, horaTxt);

  const pendiente = useAutoguardado(iso, (v) => {
    if (v && v !== consulta.occurredAt) actualizar('consultations', consulta.id, { occurredAt: v }, 'consulta.fecha');
  });

  return (
    <View style={{ gap: 16 }}>
      <View style={s.fila}>
        <View style={{ flex: 3 }}>
          <CampoFecha etiqueta="Fecha" value={fecha} onChangeText={setFecha} />
        </View>
        <View style={{ flex: 2 }}>
          <Campo etiqueta="Hora" value={horaTxt} onChangeText={setHora} placeholder="hh:mm" keyboardType="numbers-and-punctuation" />
        </View>
      </View>
      {!iso ? <TextoChico color={colors.alert}>Revisá la fecha y la hora (hh:mm).</TextoChico> : null}
      <Opciones<Modality>
        etiqueta="Modalidad"
        opciones={(Object.keys(TEXTO_MODALIDAD) as Modality[]).map((v) => ({ valor: v, texto: TEXTO_MODALIDAD[v] }))}
        valor={consulta.modality}
        onCambio={(v) => actualizar('consultations', consulta.id, { modality: v }, 'consulta.modalidad')}
      />
      {consulta.modality === 'domicilio' ? (
        domicilios.length > 0 ? (
          <Opciones
            etiqueta="Domicilio de la visita"
            columna
            opciones={domicilios}
            valor={consulta.addressId ?? domicilioActual?.id}
            onCambio={(v) => actualizar('consultations', consulta.id, { addressId: v }, 'consulta.domicilio')}
          />
        ) : (
          <TextoChico>Sin domicilios cargados: agregalos en la ficha del adulto.</TextoChico>
        )
      ) : null}
      <Opciones<VisitType>
        etiqueta="Tipo de visita"
        opciones={(Object.keys(TEXTO_VISITA) as VisitType[]).map((v) => ({ valor: v, texto: TEXTO_VISITA[v] }))}
        valor={consulta.visitType}
        onCambio={(v) => actualizar('consultations', consulta.id, { visitType: v }, 'consulta.tipo')}
      />
      <EstadoGuardado pendiente={pendiente} />
    </View>
  );
}

const s = StyleSheet.create({ fila: { flexDirection: 'row', gap: 12 } });
