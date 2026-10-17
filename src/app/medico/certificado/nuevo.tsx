/**
 * Emitir un certificado: elegir tipo, revisar y editar el texto, previsualizar y "Emitir".
 * Al emitir queda guardado en Documentos del paciente y no se puede editar (solo anular).
 */
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/data/store';
import { adultosDe, adultoPrincipal, nombreCompleto, paciente as buscarPaciente } from '@/data/selectores';
import type { CertificateType } from '@/data/types';
import { FIRMA, LUGAR_POR_DEFECTO, TIPOS_CERTIFICADO, lugarYFecha, textoCertificado, tipoCertificado } from '@/lib/certificados';
import { edades } from '@/lib/edad';
import { aCampos, ahoraISO, deFecha, hoyISO } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { Campo, Opciones, Aviso } from '@/components/Formulario';
import { Boton } from '@/components/Boton';
import { Seccion } from '@/components/Seccion';
import { Texto, TextoChico } from '@/components/Texto';
import { VistaCertificado } from '@/components/certificados/VistaCertificado';

export default function NuevoCertificado() {
  const { paciente: pid } = useLocalSearchParams<{ paciente: string }>();
  const { db, operaciones } = useApp();
  const p = buscarPaciente(db, pid);
  const adultos = p ? adultosDe(db, p.id) : [];
  const principal = p ? adultoPrincipal(db, p.id) : undefined;

  const [tipo, setTipo] = useState<CertificateType>('aptitud-fisica');
  const [texto, setTexto] = useState(() => (p ? tipoCertificado('aptitud-fisica').texto(p.sex) : ''));
  const [destino, setDestino] = useState(tipoCertificado('aptitud-fisica').destino);
  const [adulto, setAdulto] = useState(principal ? `${principal.guardian.firstName} ${principal.guardian.lastName}` : '');
  const [lugar, setLugar] = useState(LUGAR_POR_DEFECTO);
  const [fecha, setFecha] = useState(aCampos(ahoraISO()).fecha);
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmar) return;
    const t = setTimeout(() => setConfirmar(false), 5000);
    return () => clearTimeout(t);
  }, [confirmar]);

  if (!p) return <Pantalla><Texto>No encontramos a este paciente.</Texto></Pantalla>;

  const cambiarTipo = (t: CertificateType) => {
    setTipo(t);
    setTexto(tipoCertificado(t).texto(p.sex));
    setDestino(tipoCertificado(t).destino);
    setConfirmar(false);
  };

  const fechaISO = deFecha(fecha);
  const edad = edades(p, fechaISO ?? hoyISO()).cronologica;
  const cuerpo = textoCertificado({ nombre: nombreCompleto(p), dni: p.dni, edad, texto, adulto, destino });

  const emitir = () => {
    if (!texto.trim()) return setError('Escribí el texto del certificado.');
    if (!fechaISO) return setError('Revisá la fecha (dd/mm/aaaa).');
    setError(null);
    if (!confirmar) return setConfirmar(true);
    // Emitir lo hace el servidor: un certificado emitido no se edita, se anula y se emite otro.
    operaciones.emitirCertificado({
      patientId: p.id, type: tipo, body: cuerpo, requestedBy: adulto.trim(), destination: destino.trim(),
      place: lugar.trim() || LUGAR_POR_DEFECTO, date: fechaISO, titulo: tipoCertificado(tipo).titulo,
    }).then((e) => {
      if (e) return setError(e);
      // Si se abrió directo (sin pantalla anterior), vuelve a los documentos de la ficha.
      if (router.canGoBack()) router.back();
      else router.replace({ pathname: '/medico/hijo/[id]', params: { id: p.id, solapa: 'documentos' } });
    });
  };

  return (
    <Pantalla>
      <Stack.Screen options={{ title: `Certificado · ${p.firstName}` }} />

      <Opciones
        etiqueta="Tipo"
        columna
        opciones={TIPOS_CERTIFICADO.map((t) => ({ valor: t.tipo, texto: t.tipo === 'libre' ? 'Texto libre' : t.titulo, detalle: t.tipo === 'libre' ? undefined : t.paraQue }))}
        valor={tipo}
        onCambio={cambiarTipo}
      />

      <Campo etiqueta="Texto" ayuda="Va después de «Certifico que [nombre], de [edad],». Podés editarlo." value={texto} onChangeText={setTexto} multiline style={{ minHeight: 110 }} />

      {adultos.length > 0 ? (
        <Opciones
          etiqueta="A pedido de"
          opciones={adultos.map((a) => ({ valor: `${a.guardian.firstName} ${a.guardian.lastName}`, texto: `${a.guardian.firstName} ${a.guardian.lastName}` }))}
          valor={adulto}
          onCambio={setAdulto}
        />
      ) : (
        <Campo etiqueta="A pedido de" value={adulto} onChangeText={setAdulto} placeholder="Nombre del adulto responsable" />
      )}
      <Campo etiqueta="Para ser presentado ante" value={destino} onChangeText={setDestino} placeholder="el colegio" />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 3 }}><Campo etiqueta="Lugar" value={lugar} onChangeText={setLugar} /></View>
        <View style={{ flex: 2 }}><Campo etiqueta="Fecha" value={fecha} onChangeText={setFecha} placeholder="dd/mm/aaaa" keyboardType="numbers-and-punctuation" /></View>
      </View>
      {!p.dni ? <TextoChico>Sin DNI cargado: el certificado sale sin DNI. Podés cargarlo en la ficha.</TextoChico> : null}

      <Seccion titulo="Vista previa">
        <VistaCertificado titulo={tipoCertificado(tipo).titulo} cuerpo={cuerpo} lugarFecha={lugarYFecha(lugar, fechaISO ?? hoyISO())} firma={FIRMA} />
      </Seccion>

      {error ? <Aviso tono="alerta" texto={error} /> : null}
      <Boton
        titulo={confirmar ? 'Tocá de nuevo para emitir' : 'Emitir'}
        icono="ribbon-outline"
        variante={confirmar ? 'alerta' : 'principal'}
        onPress={emitir}
      />
      <TextoChico>Un certificado emitido no se edita. Si hay un error, se anula y se emite otro.</TextoChico>
    </Pantalla>
  );
}
