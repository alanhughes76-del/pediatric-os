/**
 * Ámbitos de atención: el nombre que ve el Dr. en la lista de pacientes, la ficha y los reportes.
 * Los ámbitos son fijos (membresía, Cardales, Hepta, esporádico, sin asignar); se cambia cómo se llaman.
 */
import { useState } from 'react';
import { useApp } from '@/data/store';
import type { Scope } from '@/data/types';
import { TEXTO_AMBITO } from '@/lib/busqueda';
import { Campo } from '../Formulario';
import { TextoChico } from '../Texto';
import { PieGuardar, useGuardarAjuste } from './comun';

const CLAVES = Object.keys(TEXTO_AMBITO) as Scope[];

export function Ambitos() {
  const { db } = useApp();
  const [nombres, setNombres] = useState<Record<Scope, string>>({ ...db.ambitos });
  const { guardando, mensaje, guardar } = useGuardarAjuste();

  const enviar = () => {
    const limpio = Object.fromEntries(CLAVES.map((k) => [k, nombres[k].trim()])) as Record<Scope, string>;
    const vacio = CLAVES.find((k) => !limpio[k]);
    const repetido = CLAVES.find((k, i) => CLAVES.findIndex((x) => limpio[x].toLowerCase() === limpio[k].toLowerCase()) !== i);
    const error = vacio ? 'Cada ámbito necesita un nombre.' : repetido ? `"${limpio[repetido]}" está repetido.` : undefined;
    void guardar({ clave: 'ambitos', datos: limpio }, error);
  };

  return (
    <>
      <TextoChico>Cambiá cómo se llama cada ámbito. Los pacientes no cambian de ámbito.</TextoChico>
      {CLAVES.map((k) => (
        <Campo key={k} etiqueta={`Hoy: ${TEXTO_AMBITO[k]}`} value={nombres[k]} onChangeText={(v) => setNombres((x) => ({ ...x, [k]: v }))} />
      ))}
      <TextoChico>Para sumar un ámbito nuevo (otro consultorio o institución), pedímelo: hoy son fijos.</TextoChico>
      <PieGuardar guardando={guardando} mensaje={mensaje} onGuardar={enviar} />
    </>
  );
}
