/** Membresía, precios y monedas (prompt maestro 7.16). Los montos los carga el Dr.; no van en el código. */
import { useState } from 'react';
import { View } from 'react-native';
import { useApp } from '@/data/store';
import type { Currency, Precios as TPrecios } from '@/data/types';
import { dinero, precioMembresia } from '@/data/configuracion';
import { Campo, Opciones } from '../Formulario';
import { TextoFuerte, TextoChico } from '../Texto';
import { aNumero, PieGuardar, useGuardarAjuste } from './comun';

type Visita = keyof TPrecios['visitas'];
const VISITAS: { clave: Visita; texto: string }[] = [
  { clave: 'controlOUrgenciaDia', texto: 'Control o urgencia en el día' },
  { clave: 'hermanoMismaVisita', texto: 'Hermano en la misma visita' },
  { clave: 'urgenciaNocheFinDeSemanaFeriado', texto: 'Urgencia nocturna, fin de semana o feriado' },
  { clave: 'prenatalVideollamada', texto: 'Prenatal por videollamada' },
  { clave: 'prenatalDomicilio', texto: 'Prenatal a domicilio' },
];
const MONEDAS = [{ valor: 'USD' as Currency, texto: 'Dólares (USD)' }, { valor: 'ARS' as Currency, texto: 'Pesos (ARS)' }];

const texto = (n: number) => String(n);

export function Precios() {
  const { db } = useApp();
  const p = db.precios;
  const [anual, setAnual] = useState(texto(p.membresia.anual));
  const [semestral, setSemestral] = useState(texto(p.membresia.semestral));
  const [moneda, setMoneda] = useState<Currency>(p.membresia.moneda);
  const [descuento, setDescuento] = useState(texto(p.membresia.descuentoHijoAdicionalPct));
  const [conversion, setConversion] = useState(p.membresia.conversion);
  const [visitas, setVisitas] = useState<Record<Visita, string>>(
    Object.fromEntries(VISITAS.map((v) => [v.clave, texto(p.visitas[v.clave])])) as Record<Visita, string>,
  );
  const [dias, setDias] = useState(texto(p.prenatalDescuentaDias));
  const { guardando, mensaje, guardar } = useGuardarAjuste();

  const armar = (): TPrecios => ({
    membresia: { anual: aNumero(anual), semestral: aNumero(semestral), moneda, descuentoHijoAdicionalPct: aNumero(descuento), conversion: conversion.trim() },
    visitas: Object.fromEntries(VISITAS.map((v) => [v.clave, aNumero(visitas[v.clave])])) as TPrecios['visitas'],
    prenatalDescuentaDias: aNumero(dias),
  });

  const enviar = () => {
    const datos = armar();
    const numeros = [datos.membresia.anual, datos.membresia.semestral, datos.membresia.descuentoHijoAdicionalPct, datos.prenatalDescuentaDias, ...Object.values(datos.visitas)];
    const error = numeros.some((n) => !Number.isFinite(n) || n < 0) ? 'Revisá los montos: tienen que ser números (sin letras).'
      : datos.membresia.descuentoHijoAdicionalPct > 100 ? 'El descuento no puede ser más de 100 %.' : undefined;
    void guardar({ clave: 'precios', datos }, error);
  };

  const ejemplo = (() => {
    const d = armar();
    return Number.isFinite(d.membresia.anual) && Number.isFinite(d.membresia.descuentoHijoAdicionalPct) ? precioMembresia(d, 'anual', 2) : null;
  })();

  return (
    <>
      <TextoFuerte>Membresía (por familia)</TextoFuerte>
      <Opciones etiqueta="Moneda" opciones={MONEDAS} valor={moneda} onCambio={setMoneda} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <View style={{ flex: 1, minWidth: 140 }}><Campo etiqueta="Anual" value={anual} onChangeText={setAnual} keyboardType="numeric" /></View>
        <View style={{ flex: 1, minWidth: 140 }}><Campo etiqueta="Semestral" value={semestral} onChangeText={setSemestral} keyboardType="numeric" /></View>
      </View>
      <Campo etiqueta="Descuento por cada hijo adicional (plan anual), en %" value={descuento} onChangeText={setDescuento} keyboardType="numeric" />
      {ejemplo ? <TextoChico>Ejemplo, plan anual con dos hijos: {dinero(ejemplo.monto, ejemplo.moneda)}.</TextoChico> : null}
      <Campo etiqueta="Si se paga en pesos" value={conversion} onChangeText={setConversion} multiline
        ayuda="Texto de referencia. La app no busca la cotización del día." />

      <TextoFuerte>Visitas sueltas (en pesos)</TextoFuerte>
      {VISITAS.map((v) => (
        <Campo key={v.clave} etiqueta={v.texto} value={visitas[v.clave]} keyboardType="numeric"
          onChangeText={(x) => setVisitas((xs) => ({ ...xs, [v.clave]: x }))} />
      ))}
      <Campo etiqueta="El prenatal se descuenta de la membresía si la familia se suma dentro de estos días del nacimiento" value={dias} onChangeText={setDias} keyboardType="numeric" />
      <PieGuardar guardando={guardando} mensaje={mensaje} onGuardar={enviar} />
    </>
  );
}
