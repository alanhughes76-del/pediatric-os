import { useState } from 'react';
import { useApp, useSesionFamilia } from '@/data/store';
import { pacientesDeAdulto } from '@/data/selectores';
import { edades } from '@/lib/edad';
import { Pantalla } from '@/components/Pantalla';
import { Avatar } from '@/components/Avatar';
import { SelectorSegmentado } from '@/components/SelectorSegmentado';
import { Texto } from '@/components/Texto';
import { FiebreFamilia } from '@/components/fiebre/FiebreFamilia';

/**
 * Atajo al registro de fiebre: si hay un solo hijo va directo. Si hay más, nadie queda elegido
 * de entrada, para que la temperatura no se anote en el chico equivocado.
 */
export default function FiebreTab() {
  const { db } = useApp();
  const { guardian } = useSesionFamilia();
  const hijos = pacientesDeAdulto(db, guardian.id);
  const [elegidoId, setElegidoId] = useState<string | undefined>(undefined);

  if (hijos.length === 1) {
    return <Pantalla><FiebreFamilia patientId={hijos[0].id} /></Pantalla>;
  }
  return (
    <Pantalla>
      <Texto>¿De quién querés anotar la fiebre?</Texto>
      <SelectorSegmentado
        tono="claro"
        etiqueta="Elegí de quién anotar la fiebre"
        anchoMinimo={150}
        valor={elegidoId}
        onCambio={setElegidoId}
        opciones={hijos.map((h) => ({ valor: h.id, texto: h.firstName, detalle: edades(h).cronologica, adorno: <Avatar paciente={h} tamano={36} /> }))}
      />
      {elegidoId ? <FiebreFamilia key={elegidoId} patientId={elegidoId} /> : null}
    </Pantalla>
  );
}
