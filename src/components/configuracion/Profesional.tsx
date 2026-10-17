/** Datos del profesional: nombre, matrículas y la firma que va en los certificados. */
import { useState } from 'react';
import { useApp } from '@/data/store';
import { Campo } from '../Formulario';
import { TextoChico } from '../Texto';
import { PieGuardar, useGuardarAjuste } from './comun';

export function Profesional() {
  const { db } = useApp();
  const [nombre, setNombre] = useState(db.doctor.name);
  const [mn, setMn] = useState(db.doctor.mn ?? '');
  const [mp, setMp] = useState(db.doctor.mp ?? '');
  const [firma, setFirma] = useState(db.doctor.signature);
  const { guardando, mensaje, guardar } = useGuardarAjuste();

  const enviar = () => {
    const error = !nombre.trim() ? 'Falta el nombre.' : !firma.trim() ? 'Falta la firma de los certificados.' : undefined;
    void guardar({ clave: 'profesional', datos: { name: nombre.trim(), mn: mn.trim(), mp: mp.trim(), signature: firma.trim() } }, error);
  };

  return (
    <>
      <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} placeholder="Dr. Alan Hughes" />
      <Campo etiqueta="Matrícula nacional (MN)" value={mn} onChangeText={setMn} placeholder="111.725" />
      <Campo etiqueta="Matrícula provincial (MP)" value={mp} onChangeText={setMp} placeholder="448.970" />
      <Campo etiqueta="Firma de los certificados" value={firma} onChangeText={setFirma} multiline
        ayuda="Va al pie de cada certificado nuevo. Los ya emitidos no cambian." />
      <TextoChico>La firma digital certificada todavía no está conectada.</TextoChico>
      <PieGuardar guardando={guardando} mensaje={mensaje} onGuardar={enviar} />
    </>
  );
}
