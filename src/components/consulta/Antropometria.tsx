/**
 * Antropometría de la consulta: peso, talla y PC con percentilo y Z en vivo.
 * Usa el mismo motor que la tarjeta Crecimiento (lib/crecimiento.ts → lib/percentiles.ts).
 * Se guarda sola en la GrowthMeasurement de la consulta, con la posición de la talla.
 */
import { useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useApp } from '@/data/store';
import { medicionDeConsulta } from '@/data/selectores';
import type { Consultation, Patient } from '@/data/types';
import { edadParaCalculo } from '@/lib/edad';
import { leerNumero, formatoPercentil, formatoZ, posicionPorEdad, TEXTO_AVISO, TEXTO_MOTIVO, type Posicion, type ResultadoPercentil } from '@/lib/percentiles';
import { filaDeCrecimiento, sexoDeReferencia } from '@/lib/crecimiento';
import { useAutoguardado } from '@/lib/useAutoguardado';
import { Campo, Opciones, Aviso, EstadoGuardado } from '../Formulario';
import { Texto, TextoChico, TextoFuerte } from '../Texto';
import { colors, fonts } from '@/theme';

const aTexto = (n?: number) => (n == null ? '' : String(n).replace('.', ','));

export function Antropometria({ consulta, paciente }: { consulta: Consultation; paciente: Patient }) {
  const { db, agregar, actualizar } = useApp();
  const medicion = medicionDeConsulta(db, consulta.id);
  const idMedicion = useRef(medicion?.id);
  const [peso, setPeso] = useState(aTexto(medicion?.weightKg));
  const [talla, setTalla] = useState(aTexto(medicion?.heightCm));
  const [pc, setPc] = useState(aTexto(medicion?.headCm));
  const edad = edadParaCalculo(paciente, consulta.occurredAt.slice(0, 10));
  const [posicion, setPosicion] = useState<Posicion>(medicion?.position ?? posicionPorEdad(edad.ok ? edad.meses : 0));

  const valores = { weightKg: leerNumero(peso), heightCm: leerNumero(talla), headCm: leerNumero(pc), position: posicion };

  const pendiente = useAutoguardado(valores, (v) => {
    if (idMedicion.current) {
      actualizar('measurements', idMedicion.current, { ...v, measuredAt: consulta.occurredAt.slice(0, 10) }, 'medicion.editar');
    } else if (v.weightKg != null || v.heightCm != null || v.headCm != null) {
      // La posición sola no crea la medición: hace falta al menos una medida.
      idMedicion.current = agregar('measurements', { patientId: paciente.id, consultationId: consulta.id, measuredAt: consulta.occurredAt.slice(0, 10), ...v }, 'medicion.agregar');
    }
  });

  const sexo = sexoDeReferencia(paciente);
  // Mismo cálculo que la tarjeta Crecimiento.
  const fila = filaDeCrecimiento(paciente, sexo, {
    id: 'borrador', createdAt: '', createdBy: '', patientId: paciente.id, measuredAt: consulta.occurredAt.slice(0, 10),
    weightKg: valores.weightKg, heightCm: valores.heightCm, headCm: valores.headCm, position: posicion,
  });

  return (
    <View style={{ gap: 14 }}>
      {paciente.sex === 'X' ? (
        <Opciones
          etiqueta="Sexo registrado como X: ¿qué referencia usamos?"
          opciones={[{ valor: 'M', texto: 'Referencia masculina' }, { valor: 'F', texto: 'Referencia femenina' }]}
          valor={paciente.growthReferenceSex}
          onCambio={(v) => actualizar('patients', paciente.id, { growthReferenceSex: v }, 'paciente.referencia-crecimiento')}
        />
      ) : null}

      {!edad.ok ? (
        <Aviso tono="alerta" texto={edad.motivo === 'antes-de-nacer'
          ? 'La fecha de nacimiento es posterior a la de la consulta. Revisá las fechas: no se calculan percentilos.'
          : 'Todavía no llegó a las 40 semanas de edad corregida: no hay percentilos de la OMS para esta edad.'} />
      ) : edad.corregida ? (
        <Aviso texto={`Prematuro: los percentilos se calculan con la edad corregida (${formatearMeses(edad.meses)}).`} />
      ) : null}

      <FilaMedida etiqueta="Peso (kg)" valor={peso} onCambio={setPeso} resultado={fila.peso?.resultado} />
      <FilaMedida etiqueta="Talla (cm)" valor={talla} onCambio={setTalla} resultado={fila.talla?.resultado} />
      <Opciones<Posicion>
        etiqueta="Posición de la talla"
        opciones={[{ valor: 'acostado', texto: 'Acostado' }, { valor: 'de_pie', texto: 'De pie' }]}
        valor={posicion}
        onCambio={setPosicion}
      />
      {fila.talla?.resultado.ok && fila.talla.resultado.valorUsado !== fila.talla.valor ? (
        <TextoChico>Medida {posicion === 'de_pie' ? 'de pie' : 'acostado'}: se corrige a {aTexto(Number(fila.talla.resultado.valorUsado.toFixed(1)))} cm para comparar con la referencia.</TextoChico>
      ) : null}
      <FilaMedida etiqueta="Perímetro cefálico (cm)" valor={pc} onCambio={setPc} resultado={fila.pc?.resultado} />

      {fila.imc ? (
        <View style={s.derivados}>
          <Derivado titulo={`IMC ${fila.imc.valor.toFixed(1).replace('.', ',')}`} resultado={fila.imc.resultado} />
          <Derivado titulo="Peso para la talla" resultado={fila.pesoTalla?.resultado} />
        </View>
      ) : null}

      <EstadoGuardado pendiente={pendiente} />
    </View>
  );
}

const formatearMeses = (meses: number) => `${meses.toFixed(1).replace('.', ',')} meses`;

function FilaMedida({ etiqueta, valor, onCambio, resultado }: { etiqueta: string; valor: string; onCambio: (t: string) => void; resultado?: ResultadoPercentil }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={s.fila}>
        <View style={{ width: 150 }}>
          <Campo etiqueta={etiqueta} value={valor} onChangeText={onCambio} keyboardType="decimal-pad" inputMode="decimal" placeholder="—" />
        </View>
        <View style={{ flex: 1, paddingTop: 26 }}>
          <Percentil resultado={resultado} />
        </View>
      </View>
      <AvisoCarga resultado={resultado} />
    </View>
  );
}

function Percentil({ resultado }: { resultado?: ResultadoPercentil }) {
  if (!resultado) return <TextoChico>—</TextoChico>;
  if (!resultado.ok) return <TextoChico>{TEXTO_MOTIVO[resultado.motivo]}</TextoChico>;
  const extremo = !!resultado.aviso;
  return (
    <View>
      <Texto style={[s.percentil, extremo && { color: colors.alert }]}>
        {formatoPercentil(resultado.percentil)} <Texto style={[s.z, extremo && { color: colors.alert }]}>Z {formatoZ(resultado.z)}</Texto>
      </Texto>
      <TextoChico>{resultado.etiqueta}</TextoChico>
    </View>
  );
}

function AvisoCarga({ resultado }: { resultado?: ResultadoPercentil }) {
  if (!resultado || !resultado.ok || !resultado.aviso) return null;
  return <Aviso tono="alerta" texto={`Z ${formatoZ(resultado.z)}: ${TEXTO_AVISO[resultado.aviso]}`} />;
}

function Derivado({ titulo, resultado }: { titulo: string; resultado?: ResultadoPercentil }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <TextoFuerte>{titulo}</TextoFuerte>
      <Percentil resultado={resultado} />
      <AvisoCarga resultado={resultado} />
    </View>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  percentil: { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.primary },
  z: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.primary2 },
  derivados: { flexDirection: 'row', gap: 14, backgroundColor: colors.bg, borderRadius: 12, padding: 12 },
});
