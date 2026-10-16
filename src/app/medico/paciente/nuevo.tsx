/**
 * Nuevo paciente. Obligatorios: nombre, apellido, fecha de nacimiento y sexo.
 * Opcionales: ámbito (por defecto "Sin asignar") y edad gestacional (22 a 44 semanas;
 * vacía = de término). Antes de guardar avisa si ya hay alguien con el mismo apellido
 * y fecha de nacimiento, y ofrece abrir el existente.
 */
import { useState } from 'react';
import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useApp } from '@/data/store';
import type { Scope, Sex } from '@/data/types';
import { posiblesDuplicados, TEXTO_AMBITO } from '@/lib/busqueda';
import { deFecha, diasEntre, hoyISO, fechaCorta } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { Campo, Opciones, Aviso } from '@/components/Formulario';
import { Boton } from '@/components/Boton';
import { Tarjeta } from '@/components/Tarjeta';
import { TextoFuerte } from '@/components/Texto';

const SEXOS: { valor: Sex; texto: string }[] = [
  { valor: 'M', texto: 'M' },
  { valor: 'F', texto: 'F' },
  { valor: 'X', texto: 'X' },
];

export default function NuevoPaciente() {
  const { db, agregar } = useApp();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [fecha, setFecha] = useState('');
  const [sexo, setSexo] = useState<Sex>();
  const [ambito, setAmbito] = useState<Scope>('sin-asignar');
  const [semanas, setSemanas] = useState('');
  const [dni, setDni] = useState('');
  const [intento, setIntento] = useState(false);
  const [duplicadoVisto, setDuplicadoVisto] = useState(false);

  const nacimiento = deFecha(fecha);
  const sem = semanas.trim() ? Number(semanas.trim()) : undefined;

  const errores = {
    nombre: !nombre.trim() ? 'Escribí el nombre.' : undefined,
    apellido: !apellido.trim() ? 'Escribí el apellido.' : undefined,
    fecha: !nacimiento ? 'Escribí la fecha como dd/mm/aaaa.' : diasEntre(nacimiento, hoyISO()) < 0 ? 'La fecha de nacimiento no puede ser futura.' : undefined,
    sexo: !sexo ? 'Elegí el sexo.' : undefined,
    semanas: sem !== undefined && !(Number.isInteger(sem) && sem >= 22 && sem <= 44) ? 'Tiene que ser un número entero entre 22 y 44.' : undefined,
  };
  const valido = !Object.values(errores).some(Boolean);
  const duplicados = valido && nacimiento ? posiblesDuplicados(db.patients, apellido, nacimiento) : [];

  const guardar = (aunqueExista = false) => {
    setIntento(true);
    if (!valido || !nacimiento || !sexo) return;
    if (duplicados.length > 0 && !aunqueExista) return setDuplicadoVisto(true);
    const id = agregar('patients', {
      firstName: nombre.trim(), lastName: apellido.trim(), birthDate: nacimiento, sex: sexo,
      gestationalWeeks: sem, scope: ambito, status: 'activo', dni: dni.trim() || undefined,
    }, 'paciente.crear');
    router.replace(`/medico/hijo/${id}`);
  };

  return (
    <Pantalla>
      <Stack.Screen options={{ title: 'Nuevo paciente' }} />

      <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} autoCapitalize="words" error={intento ? errores.nombre : undefined} />
      <Campo etiqueta="Apellido" value={apellido} onChangeText={(v) => { setApellido(v); setDuplicadoVisto(false); }} autoCapitalize="words" error={intento ? errores.apellido : undefined} />
      <Campo
        etiqueta="Fecha de nacimiento"
        value={fecha}
        onChangeText={(v) => { setFecha(v); setDuplicadoVisto(false); }}
        placeholder="dd/mm/aaaa"
        keyboardType="numbers-and-punctuation"
        error={intento ? errores.fecha : undefined}
      />
      <Opciones etiqueta="Sexo" opciones={SEXOS} valor={sexo} onCambio={setSexo} />
      {intento && errores.sexo ? <Aviso tono="alerta" texto={errores.sexo} /> : null}

      <Campo etiqueta="DNI (opcional)" value={dni} onChangeText={setDni} keyboardType="number-pad" placeholder="Ej.: 55123456" ayuda="Si está cargado, aparece en los certificados." />
      <Opciones
        etiqueta="Ámbito (opcional)"
        opciones={(Object.keys(TEXTO_AMBITO) as Scope[]).map((v) => ({ valor: v, texto: TEXTO_AMBITO[v] }))}
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
        <Boton titulo="Guardar paciente" icono="checkmark" onPress={() => guardar()} />
      )}
    </Pantalla>
  );
}
