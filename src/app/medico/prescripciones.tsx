/**
 * Prescripciones (Etapa 5): la medicación activa de todos los pacientes y lo indicado que todavía
 * no se emitió en la plataforma de recetas. Se cargan en la ficha (pestaña Medicaciones).
 */
import { router } from 'expo-router';
import { useApp } from '@/data/store';
import { medicacionActivaDeTodos } from '@/data/seguimientoClinico';
import { nombreCompleto } from '@/data/selectores';
import { fechaCorta, hoyISO } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { Titulo, Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { Tarjeta } from '@/components/Tarjeta';
import { Caja, Grilla } from '@/components/Caja';
import { colors } from '@/theme';

export default function Prescripciones() {
  const { db } = useApp();
  const activas = medicacionActivaDeTodos(db, hoyISO());
  const sinEmitir = db.prescriptions
    .filter((x) => !x.archivedAt && !x.issuedAt)
    .map((x) => ({ x, p: db.patients.find((p) => p.id === x.patientId && !p.archivedAt) }))
    .filter((r) => r.p)
    .sort((a, b) => b.x.date.localeCompare(a.x.date));
  const ficha = (id: string) => router.push({ pathname: '/medico/hijo/[id]', params: { id, solapa: 'medicaciones' } });

  return (
    <Pantalla ancho>
      <Titulo>Prescripciones</Titulo>
      <TextoChico>La app no emite recetas: registra lo indicado y abre tu plataforma registrada.</TextoChico>
      <Grilla>
        <Caja titulo={`Medicación activa (${activas.length})`} icono="reader-outline" color="celeste">
          {activas.length === 0 ? <Texto color={colors.textMuted}>Ningún paciente con medicación activa.</Texto> : null}
          {activas.map(({ medicacion: m, paciente: p }) => (
            <Tarjeta key={m.id} onPress={() => ficha(p.id)} accessibilityLabel={`${m.drug}, ${nombreCompleto(p)}`}>
              <TextoFuerte>{m.drug}{m.presentation ? ` · ${m.presentation}` : ''}</TextoFuerte>
              <TextoChico>{nombreCompleto(p)} · {m.dose}{m.endDate ? ` · hasta ${fechaCorta(m.endDate)}` : ''}</TextoChico>
            </Tarjeta>
          ))}
        </Caja>
        <Caja titulo={`Sin emitir en la plataforma (${sinEmitir.length})`} icono="open-outline" color="naranja">
          {sinEmitir.length === 0 ? <Texto color={colors.textMuted}>Todo lo indicado figura como emitido.</Texto> : null}
          {sinEmitir.map(({ x, p }) => (
            <Tarjeta key={x.id} onPress={() => ficha(p!.id)} accessibilityLabel={`Prescripción de ${nombreCompleto(p!)}`}>
              <TextoFuerte>{nombreCompleto(p!)}</TextoFuerte>
              <TextoChico>{fechaCorta(x.date)} · {x.detail}</TextoChico>
            </Tarjeta>
          ))}
        </Caja>
      </Grilla>
    </Pantalla>
  );
}
