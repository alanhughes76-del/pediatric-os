/**
 * Nuevo paciente (prompt maestro 7.4). Obligatorios: nombre, apellido, fecha de nacimiento y sexo.
 * Opcionales: DNI, ámbito (por defecto "Sin asignar"), cobertura, edad gestacional (22 a 44
 * semanas; vacía = de término) y grupo sanguíneo. La foto todavía no se puede cargar.
 * Control de duplicados (regla 8, shared/duplicados.ts): el mismo DNI no deja guardar; el mismo
 * apellido y fecha de nacimiento pide confirmar (pueden ser mellizos).
 * Si se abre desde la ficha de una familia (?familia=…), el paciente queda en esa familia y se vincula
 * con sus adultos (pedido del Dr., 18/10/2026): la relación se copia de lo que cada adulto es para los
 * hermanos y, si no hay de dónde copiarla, la elige el Dr. Se puede destildar a quien no corresponda.
 */
import { CampoFecha } from '@/components/CampoFecha';
import { useState } from 'react';
import { View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/data/store';
import { GRUPOS_SANGUINEOS, type BloodType, type CoverageKind, type Guardian, type RelationshipType, type Scope, type Sex } from '@/data/types';
import { buscarDuplicados } from '@/lib/busqueda';
import { TEXTO_COBERTURA } from '@/data/selectores';
import { deFecha, diasEntre, hoyISO, fechaCorta } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { Campo, Opciones, Aviso, Casilla } from '@/components/Formulario';
import { Boton } from '@/components/Boton';
import { ErrorComprensible } from '@/components/Estados';
import { Tarjeta } from '@/components/Tarjeta';
import { TextoFuerte, TextoChico } from '@/components/Texto';

const SEXOS: { valor: Sex; texto: string }[] = [
  { valor: 'M', texto: 'M' },
  { valor: 'F', texto: 'F' },
  { valor: 'X', texto: 'X' },
];

const RELACIONES: { valor: RelationshipType; texto: string }[] = [
  { valor: 'madre', texto: 'Madre' },
  { valor: 'padre', texto: 'Padre' },
  { valor: 'otro', texto: 'Otro' },
];

interface Vinculo { incluir: boolean; tipo?: RelationshipType; detalle: string }

const COBERTURAS = (Object.keys(TEXTO_COBERTURA) as CoverageKind[]).map((v) => ({ valor: v, texto: TEXTO_COBERTURA[v] }));

export default function NuevoPaciente() {
  const { familia: familiaId } = useLocalSearchParams<{ familia?: string }>();
  const { db, operaciones, agregar } = useApp();
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const familia = db.families.find((f) => f.id === familiaId);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [fecha, setFecha] = useState('');
  const [sexo, setSexo] = useState<Sex>();
  const [ambito, setAmbito] = useState<Scope>('sin-asignar');
  const [semanas, setSemanas] = useState('');
  const [dni, setDni] = useState('');
  const [cobertura, setCobertura] = useState<CoverageKind>();
  const [nombreCobertura, setNombreCobertura] = useState('');
  const [numeroAfiliado, setNumeroAfiliado] = useState('');
  const [grupo, setGrupo] = useState<BloodType>();
  const [intento, setIntento] = useState(false);
  const [duplicadoVisto, setDuplicadoVisto] = useState(false);

  // Adultos de la familia y lo que son para los hermanos (para proponer la misma relación).
  const adultos: Guardian[] = familia ? db.guardians.filter((g) => g.familyId === familia.id && !g.archivedAt) : [];
  const hermanos = new Set(familia ? db.patients.filter((x) => x.familyId === familia.id && !x.archivedAt).map((x) => x.id) : []);
  const delHermano = (gid: string) => db.relationships.find((r) => r.guardianId === gid && hermanos.has(r.patientId) && !r.archivedAt && !r.validTo);
  const principalHermanos = adultos.find((g) => delHermano(g.id)?.isPrimary)?.id;
  // Solo se guarda lo que tocó el Dr.; el resto sale de lo propuesto (los datos pueden llegar después de abrir el formulario).
  const [cambios, setCambios] = useState<Record<string, Vinculo>>({});
  const vinculo = (g: Guardian): Vinculo => cambios[g.id] ?? { incluir: true, tipo: delHermano(g.id)?.type, detalle: delHermano(g.id)?.typeDetail ?? '' };
  const cambiar = (g: Guardian, v: Partial<Vinculo>) => setCambios((c) => ({ ...c, [g.id]: { ...vinculo(g), ...v } }));
  const incluidos = adultos.filter((g) => vinculo(g).incluir);
  const faltaRelacion = incluidos.some((g) => !vinculo(g).tipo || (vinculo(g).tipo === 'otro' && !vinculo(g).detalle.trim()));

  const nacimiento = deFecha(fecha);
  const sem = semanas.trim() ? Number(semanas.trim()) : undefined;

  const errores = {
    nombre: !nombre.trim() ? 'Escribí el nombre.' : undefined,
    apellido: !apellido.trim() ? 'Escribí el apellido.' : undefined,
    fecha: !nacimiento ? 'Elegí la fecha de nacimiento.' : diasEntre(nacimiento, hoyISO()) < 0 ? 'La fecha de nacimiento no puede ser futura.' : undefined,
    sexo: !sexo ? 'Elegí el sexo.' : undefined,
    vinculos: faltaRelacion ? 'Elegí la relación de cada adulto que vas a vincular (o destildalo).' : undefined,
    semanas: sem !== undefined && !(Number.isInteger(sem) && sem >= 22 && sem <= 44) ? 'Tiene que ser un número entero entre 22 y 44.' : undefined,
  };
  const valido = !Object.values(errores).some(Boolean);
  const { mismoDni, posibles: duplicados } = valido && nacimiento
    ? buscarDuplicados(db.patients, { lastName: apellido, birthDate: nacimiento, dni })
    : { mismoDni: [], posibles: [] };

  const guardar = async (aunqueExista = false) => {
    setIntento(true);
    if (!valido || !nacimiento || !sexo || mismoDni.length > 0 || guardando) return;
    if (duplicados.length > 0 && !aunqueExista) return setDuplicadoVisto(true);
    // El alta pasa por el servidor (control de duplicados también allá).
    setGuardando(true);
    const r = await operaciones.crearPaciente({
      firstName: nombre.trim(), lastName: apellido.trim(), birthDate: nacimiento, sex: sexo,
      gestationalWeeks: sem, scope: ambito, status: 'activo', dni: dni.trim() || undefined,
      familyId: familia?.id,
      coverage: cobertura ? { kind: cobertura, name: nombreCobertura.trim() || undefined, memberNumber: numeroAfiliado.trim() || undefined } : undefined,
      bloodType: grupo,
    }, aunqueExista);
    setGuardando(false);
    if (r.estado === 'creado') {
      const principal = incluidos.some((g) => g.id === principalHermanos) ? principalHermanos : incluidos[0]?.id;
      for (const g of incluidos) {
        const v = vinculo(g);
        agregar('relationships', {
          patientId: r.id, guardianId: g.id, type: v.tipo!, typeDetail: v.tipo === 'otro' ? v.detalle.trim() : undefined,
          isPrimary: g.id === principal, validFrom: hoyISO(),
        }, 'vinculo.crear');
      }
      return router.replace(`/medico/hijo/${r.id}`);
    }
    if (r.estado === 'posible-duplicado') return setDuplicadoVisto(true);
    setErrorServidor(r.mensaje);
  };

  return (
    <Pantalla>
      <Stack.Screen options={{ title: 'Nuevo paciente' }} />
      {familia ? <Aviso icono="people-outline" texto={`Queda en la ${familia.name}.`} /> : null}

      <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} autoCapitalize="words" error={intento ? errores.nombre : undefined} />
      <Campo etiqueta="Apellido" value={apellido} onChangeText={(v) => { setApellido(v); setDuplicadoVisto(false); }} autoCapitalize="words" error={intento ? errores.apellido : undefined} />
      <CampoFecha
        etiqueta="Fecha de nacimiento"
        value={fecha}
        onChangeText={(v) => { setFecha(v); setDuplicadoVisto(false); }}
        maximo={hoyISO()}
        minimo="1995-01-01"
        error={intento ? errores.fecha : undefined}
      />
      <Opciones etiqueta="Sexo" opciones={SEXOS} valor={sexo} onCambio={setSexo} />
      {intento && errores.sexo ? <Aviso tono="alerta" texto={errores.sexo} /> : null}

      <Campo etiqueta="DNI (opcional)" value={dni} onChangeText={setDni} keyboardType="number-pad" placeholder="Ej.: 55123456" ayuda="Si está cargado, aparece en los certificados." />
      {mismoDni.length > 0 ? (
        <Tarjeta style={{ gap: 10 }}>
          <Aviso tono="alerta" texto={`Ya hay un paciente con ese DNI: ${mismoDni[0].lastName}, ${mismoDni[0].firstName}. No se puede cargar dos veces.`} />
          <Boton titulo="Abrir el existente" variante="secundario" onPress={() => router.replace(`/medico/hijo/${mismoDni[0].id}`)} />
        </Tarjeta>
      ) : null}
      <Opciones
        etiqueta="Ámbito (opcional)"
        opciones={(Object.keys(db.ambitos) as Scope[]).map((v) => ({ valor: v, texto: db.ambitos[v] }))}
        valor={ambito}
        onCambio={setAmbito}
      />
      <Campo
        etiqueta="Edad gestacional al nacer, en semanas (opcional)"
        ayuda="Entre 22 y 44. Si queda vacía, se toma como de término."
        value={semanas}
        onChangeText={setSemanas}
        keyboardType="number-pad"
        placeholder="Ej.: 38"
        error={intento ? errores.semanas : undefined}
      />

      <Opciones etiqueta="Cobertura (opcional)" opciones={COBERTURAS} valor={cobertura} onCambio={setCobertura} />
      {cobertura && cobertura !== 'particular' ? (
        <>
          <Campo etiqueta={cobertura === 'prepaga' ? 'Prepaga y plan' : 'Obra social'} value={nombreCobertura} onChangeText={setNombreCobertura} />
          <Campo etiqueta="Número de afiliado (opcional)" value={numeroAfiliado} onChangeText={setNumeroAfiliado} />
        </>
      ) : null}
      <Opciones etiqueta="Grupo sanguíneo (opcional)" opciones={GRUPOS_SANGUINEOS.map((g) => ({ valor: g, texto: g }))} valor={grupo} onCambio={setGrupo} />

      {adultos.length > 0 ? (
        <Tarjeta style={{ gap: 12 }}>
          <TextoFuerte>Adultos de la familia</TextoFuerte>
          <TextoChico>Quedan vinculados a este paciente. Confirmá la relación de cada uno.</TextoChico>
          {adultos.map((g) => {
            const v = vinculo(g);
            return (
              <View key={g.id} style={{ gap: 8 }}>
                <Casilla marcada={v.incluir} onCambio={(incluir) => cambiar(g, { incluir })} texto={`Vincular a ${g.firstName} ${g.lastName}`} />
                {v.incluir ? (
                  <>
                    <Opciones etiqueta={`¿Qué es ${g.firstName} para este paciente?`} opciones={RELACIONES} valor={v.tipo} onCambio={(tipo) => cambiar(g, { tipo })} />
                    {v.tipo === 'otro' ? <Campo etiqueta="Aclará la relación" value={v.detalle} onChangeText={(detalle) => cambiar(g, { detalle })} placeholder="Ej.: abuela" /> : null}
                  </>
                ) : null}
              </View>
            );
          })}
          {intento && errores.vinculos ? <Aviso tono="alerta" texto={errores.vinculos} /> : null}
        </Tarjeta>
      ) : null}

      {errorServidor ? <ErrorComprensible texto={errorServidor} /> : null}
      {duplicadoVisto && duplicados.length > 0 ? (
        <Tarjeta style={{ gap: 10 }}>
          <Aviso tono="alerta" texto={`Ya ${duplicados.length === 1 ? 'hay un paciente' : `hay ${duplicados.length} pacientes`} con apellido ${duplicados[0].lastName} y fecha de nacimiento ${fechaCorta(nacimiento!)}.`} />
          {duplicados.map((d) => (
            <View key={d.id} style={{ gap: 6 }}>
              <TextoFuerte>{d.lastName}, {d.firstName}</TextoFuerte>
              <Boton titulo="Abrir el existente" variante="secundario" onPress={() => router.replace(`/medico/hijo/${d.id}`)} />
            </View>
          ))}
          <Boton titulo="Es otro paciente: guardar igual" variante="contorno" onPress={() => guardar(true)} />
        </Tarjeta>
      ) : (
        <Boton titulo={guardando ? 'Guardando…' : 'Guardar paciente'} icono="checkmark" deshabilitado={guardando} onPress={() => guardar()} />
      )}
    </Pantalla>
  );
}
