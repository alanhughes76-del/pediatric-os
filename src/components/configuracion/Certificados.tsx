/**
 * Plantillas de certificados: el texto y el destino con los que arranca cada tipo de certificado nuevo.
 * El formato fijo ("Certifico que [nombre], DNI…, de [edad], [texto]. Se extiende a pedido de…") no cambia.
 * Los certificados ya emitidos no cambian.
 */
import { useState } from 'react';
import { View } from 'react-native';
import { useApp } from '@/data/store';
import type { PlantillasCertificado } from '@/data/types';
import { plantillaInicial, textoCertificado, textoDePlantilla, tipoCertificado, TIPOS_CON_PLANTILLA, type TipoConPlantilla } from '@/lib/certificados';
import { Campo } from '../Formulario';
import { TextoFuerte, TextoChico } from '../Texto';
import { BotonTexto } from '../ficha/piezas';
import { PieGuardar, useGuardarAjuste } from './comun';
import { colors } from '@/theme';

type Edicion = Record<TipoConPlantilla, { texto: string; destino: string }>;

export function Certificados() {
  const { db } = useApp();
  const [plantillas, setPlantillas] = useState<Edicion>(() => Object.fromEntries(
    TIPOS_CON_PLANTILLA.map((t) => [t, db.plantillas[t] ?? plantillaInicial(t)]),
  ) as Edicion);
  const { guardando, mensaje, guardar } = useGuardarAjuste();

  const cambiar = (t: TipoConPlantilla, campo: 'texto' | 'destino', v: string) => setPlantillas((x) => ({ ...x, [t]: { ...x[t], [campo]: v } }));

  const enviar = () => {
    // Solo se guarda lo que difiere del texto prearmado.
    const datos: PlantillasCertificado = {};
    for (const t of TIPOS_CON_PLANTILLA) {
      const p = { texto: plantillas[t].texto.trim(), destino: plantillas[t].destino.trim() };
      const inicial = plantillaInicial(t);
      if (p.texto !== inicial.texto || p.destino !== inicial.destino) datos[t] = p;
    }
    const vacio = TIPOS_CON_PLANTILLA.find((t) => !plantillas[t].texto.trim());
    void guardar({ clave: 'certificados', datos }, vacio ? `${tipoCertificado(vacio).titulo}: el texto no puede quedar vacío.` : undefined);
  };

  return (
    <>
      <TextoChico>Escribí {'{apto}'} donde va «apto» o «apta»: se completa según el chico. Cambia solo el texto con el que arranca cada certificado nuevo; los ya emitidos quedan como están.</TextoChico>
      {TIPOS_CON_PLANTILLA.map((t) => {
        const ejemplo = textoCertificado({
          nombre: 'Ana Ejemplo', edad: '5 años', adulto: 'su mamá',
          texto: textoDePlantilla({ [t]: plantillas[t] }, t, 'F'), destino: plantillas[t].destino,
        });
        return (
          <View key={t} style={{ gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
            <TextoFuerte>{tipoCertificado(t).titulo}</TextoFuerte>
            <Campo etiqueta="Texto" value={plantillas[t].texto} multiline onChangeText={(v) => cambiar(t, 'texto', v)} />
            <Campo etiqueta="Para presentar ante" value={plantillas[t].destino} onChangeText={(v) => cambiar(t, 'destino', v)} placeholder="el colegio" />
            <TextoChico color={colors.textMuted}>Así queda: {ejemplo}</TextoChico>
            <BotonTexto texto="Volver al texto original" onPress={() => setPlantillas((x) => ({ ...x, [t]: plantillaInicial(t) }))} />
          </View>
        );
      })}
      <PieGuardar guardando={guardando} mensaje={mensaje} onGuardar={enviar} />
    </>
  );
}
