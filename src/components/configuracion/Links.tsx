/** Links que usa la app: PacienteX, Cal.com y la plataforma de recetas. */
import { useState } from 'react';
import { useApp } from '@/data/store';
import type { Links as TLinks } from '@/data/types';
import { validarLink } from '@/data/configuracion';
import { Campo } from '../Formulario';
import { PieGuardar, useGuardarAjuste } from './comun';

const CAMPOS: { clave: keyof TLinks; etiqueta: string; ayuda?: string; esLink: boolean }[] = [
  { clave: 'pacienteXUrl', etiqueta: 'PacienteX', ayuda: 'Lo abre el botón "Escribime por PacienteX" del portal.', esLink: true },
  { clave: 'calControlUrl', etiqueta: 'Cal.com · Control de salud', ayuda: 'Vacío: la familia pide la visita solo desde el portal.', esLink: true },
  { clave: 'calUrgenciaUrl', etiqueta: 'Cal.com · Urgencia', esLink: true },
  { clave: 'recetasNombre', etiqueta: 'Plataforma de recetas (nombre)', ayuda: 'Registrada en ReNaPDiS. La app no emite recetas: abre esta plataforma.', esLink: false },
  { clave: 'recetasUrl', etiqueta: 'Plataforma de recetas (link)', esLink: true },
];

export function Links() {
  const { db } = useApp();
  const [links, setLinks] = useState<TLinks>(db.links);
  const { guardando, mensaje, guardar } = useGuardarAjuste();

  const enviar = () => {
    const mal = CAMPOS.find((c) => c.esLink && validarLink(links[c.clave]));
    const error = !links.pacienteXUrl.trim() ? 'El link de PacienteX no puede quedar vacío: es el contacto de las familias.'
      : mal ? `${mal.etiqueta}: ${validarLink(links[mal.clave])}` : undefined;
    const limpio = Object.fromEntries(Object.entries(links).map(([k, v]) => [k, v.trim()])) as unknown as TLinks;
    void guardar({ clave: 'links', datos: limpio }, error);
  };

  return (
    <>
      {CAMPOS.map((c) => (
        <Campo key={c.clave} etiqueta={c.etiqueta} ayuda={c.ayuda} value={links[c.clave]} autoCapitalize="none" autoCorrect={false}
          keyboardType={c.esLink ? 'url' : 'default'} placeholder={c.esLink ? 'https://…' : ''}
          error={c.esLink ? validarLink(links[c.clave]) : undefined}
          onChangeText={(v) => setLinks((x) => ({ ...x, [c.clave]: v }))} />
      ))}
      <PieGuardar guardando={guardando} mensaje={mensaje} onGuardar={enviar} />
    </>
  );
}
