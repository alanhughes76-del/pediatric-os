/**
 * IA Asistente: interruptor general (prompt maestro 7.18). Arranca apagada; para encenderla, el Dr.
 * confirma que revisó el consentimiento informado para usar IA con datos de salud (queda la fecha).
 * Que responda depende además de la clave de la API en el servidor (nunca en la app).
 */
import { useState } from 'react';
import { useApp } from '@/data/store';
import { ahoraISO, fechaCorta } from '@/lib/fechas';
import { Casilla, Aviso } from '../Formulario';
import { Boton } from '../Boton';
import { Etiqueta } from '../Etiqueta';
import { Texto, TextoChico } from '../Texto';
import { useGuardarAjuste } from './comun';

export function IA() {
  const { db, fuente } = useApp();
  const [revisado, setRevisado] = useState(false);
  const { guardando, mensaje, guardar } = useGuardarAjuste();
  const encendida = db.ia.enabled;

  return (
    <>
      <Etiqueta texto={encendida ? 'Encendida' : 'Apagada'} tono={encendida ? 'violeta' : 'neutro'} />
      <Texto>Resume la historia, prepara la evolución de la consulta, sugiere material de tu biblioteca y revisa estudios pendientes. Siempre es una propuesta: nada entra a la historia ni llega a una familia sin tu revisión.</Texto>
      <TextoChico>A la IA se le manda solo lo necesario para cada pedido: sin nombre, DNI, dirección, cobertura ni contactos. Cada uso queda registrado (qué, de qué paciente, cuándo y si lo aceptaste). Si una familia revoca su consentimiento de IA, no se usa con ese paciente.</TextoChico>
      {db.ia.consentimientoRevisadoAt ? <TextoChico>Consentimiento revisado el {fechaCorta(db.ia.consentimientoRevisadoAt)}.</TextoChico> : null}
      {fuente === 'demo' ? <Aviso texto="En la demostración no hay IA real: solo se muestra el flujo del borrador de evolución." /> : null}
      {mensaje ? <Aviso tono={mensaje.tono} texto={mensaje.texto} /> : null}
      {encendida ? (
        <Boton titulo={guardando ? 'Guardando…' : 'Apagar la IA'} variante="contorno" compacto deshabilitado={guardando}
          onPress={() => void guardar({ clave: 'ia', datos: { enabled: false, consentimientoRevisadoAt: db.ia.consentimientoRevisadoAt } })} />
      ) : (
        <>
          <Casilla marcada={revisado} onCambio={setRevisado} texto="Revisé el consentimiento informado para usar IA con datos de salud"
            detalle="Es requisito para encenderla. Las familias pueden revocarlo." />
          <Boton titulo={guardando ? 'Guardando…' : 'Encender la IA'} icono="sparkles-outline" compacto deshabilitado={guardando || !revisado}
            onPress={() => void guardar({ clave: 'ia', datos: { enabled: true, consentimientoRevisadoAt: ahoraISO() } })} />
        </>
      )}
      <TextoChico>Para que responda, además, hace falta la clave de la API de Claude en el servidor (se carga al crear el proyecto real).</TextoChico>
    </>
  );
}
