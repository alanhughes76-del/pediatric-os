/**
 * Configuración (prompt maestro 7.21). Una sección por vez (`?seccion=`), para que en el teléfono
 * no sea una pantalla interminable. Solo el médico la cambia (reglas).
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/data/store';
import { Pantalla } from '@/components/Pantalla';
import { Opciones } from '@/components/Formulario';
import { Caja } from '@/components/Caja';
import { Boton } from '@/components/Boton';
import { Etiqueta } from '@/components/Etiqueta';
import { Titulo, Texto, TextoChico } from '@/components/Texto';
import { Profesional } from '@/components/configuracion/Profesional';
import { Agenda } from '@/components/configuracion/Agenda';
import { Precios } from '@/components/configuracion/Precios';
import { Links } from '@/components/configuracion/Links';
import { Ambitos } from '@/components/configuracion/Ambitos';
import { Certificados } from '@/components/configuracion/Certificados';

const SECCIONES = [
  { valor: 'profesional', texto: 'Profesional' },
  { valor: 'agenda', texto: 'Agenda' },
  { valor: 'precios', texto: 'Membresía y precios' },
  { valor: 'links', texto: 'Links' },
  { valor: 'ambitos', texto: 'Ámbitos' },
  { valor: 'certificados', texto: 'Certificados' },
  { valor: 'clinica', texto: 'Vacunas y biblioteca' },
  { valor: 'mas', texto: 'IA y más' },
] as const;
type Clave = (typeof SECCIONES)[number]['valor'];

export default function Configuracion() {
  const { db, fuente } = useApp();
  const { seccion: param } = useLocalSearchParams<{ seccion?: string }>();
  const seccion: Clave = SECCIONES.some((x) => x.valor === param) ? (param as Clave) : 'profesional';
  const ir = (v: Clave) => router.setParams({ seccion: v });

  return (
    <Pantalla ancho>
      <Titulo>Configuración</Titulo>
      <Opciones opciones={SECCIONES.map((x) => ({ ...x }))} valor={seccion} onCambio={ir} />
      {fuente === 'demo' ? <TextoChico>En la demostración los cambios quedan solo en este dispositivo hasta que cierres la app.</TextoChico> : null}

      {/* key: al cambiar de sección, el formulario arranca con lo guardado. */}
      {seccion === 'profesional' ? (
        <Caja key="profesional" titulo="Datos del profesional" icono="person-circle-outline" color="celeste" ancha><Profesional /></Caja>
      ) : null}
      {seccion === 'agenda' ? (
        <Caja key="agenda" titulo="Agenda" icono="calendar-outline" color="celeste" ancha><Agenda /></Caja>
      ) : null}
      {seccion === 'precios' ? (
        <Caja key="precios" titulo="Membresía y precios" icono="wallet-outline" color="verde" ancha><Precios /></Caja>
      ) : null}
      {seccion === 'links' ? (
        <Caja key="links" titulo="Links" icono="link-outline" color="celeste" ancha><Links /></Caja>
      ) : null}
      {seccion === 'ambitos' ? (
        <Caja key="ambitos" titulo="Ámbitos de atención" icono="business-outline" color="celeste" ancha><Ambitos /></Caja>
      ) : null}
      {seccion === 'certificados' ? (
        <Caja key="certificados" titulo="Plantillas de certificados" icono="ribbon-outline" color="celeste" ancha><Certificados /></Caja>
      ) : null}
      {seccion === 'clinica' ? (
        <>
          <Caja titulo="Calendario de vacunas" icono="shield-checkmark-outline" color="rosado" ancha>
            <Etiqueta texto={db.vacunas.calendarioVerificado ? 'Verificado' : 'Sin verificar (borrador)'} tono={db.vacunas.calendarioVerificado ? 'verde' : 'naranja'} />
            <Texto>Mientras esté sin verificar, la familia no ve fechas estimadas y no salen recordatorios.</Texto>
            <Boton titulo="Abrir Vacunas" icono="open-outline" variante="secundario" compacto onPress={() => router.navigate('/medico/vacunas')} />
          </Caja>
          <Caja titulo="Biblioteca educativa" icono="leaf-outline" color="naranja" ancha>
            <Texto>{db.educationalMaterials.filter((m) => !m.archivedAt).length} materiales cargados.</Texto>
            <Boton titulo="Abrir Prevención" icono="open-outline" variante="secundario" compacto onPress={() => router.navigate('/medico/prevencion')} />
          </Caja>
        </>
      ) : null}
      {seccion === 'mas' ? (
        <>
          <Caja titulo="IA Asistente" icono="sparkles-outline" color="violeta" ancha>
            <Etiqueta texto={db.ia.enabled ? 'Encendida' : 'Apagada'} tono={db.ia.enabled ? 'violeta' : 'neutro'} />
            <Texto>La IA todavía no está conectada: se conecta en la Etapa 9, después de que revises el consentimiento para usar IA con datos de salud. Hasta entonces queda apagada.</Texto>
          </Caja>
          <Caja titulo="Todavía no se configuran acá" icono="construct-outline" color="celeste" ancha>
            <TextoChico>Automatizaciones (webhook de Make, secreto de firma y eventos): Etapa 8. El secreto se guarda en el servidor, nunca en la app.</TextoChico>
          </Caja>
        </>
      ) : null}
    </Pantalla>
  );
}
