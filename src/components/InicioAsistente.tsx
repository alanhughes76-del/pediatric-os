/**
 * Inicio del asistente administrativo: turnos de hoy, lo que falta confirmar, los próximos días,
 * pagos a confirmar e interesados nuevos. Nada clínico (ni seguimientos ni fiebre).
 */
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/data/store';
import { porConfirmar, turnosDelDia, turnosEntre } from '@/data/selectores';
import { pagosAConfirmar, familiaDePago } from '@/data/membresias';
import { diaDe, sumarDiasA } from '@shared/agenda';
import { ahoraISO, diaYFecha, fechaCorta } from '@/lib/fechas';
import { Pantalla } from './Pantalla';
import { Seccion } from './Seccion';
import { Tarjeta } from './Tarjeta';
import { Boton } from './Boton';
import { TarjetaTurno } from './agenda/piezas';
import { Titulo, Texto, TextoFuerte, TextoChico } from './Texto';
import { colors } from '@/theme';

export function InicioAsistente() {
  const { db } = useApp();
  const hoy = diaDe(ahoraISO());
  const visitas = turnosDelDia(db, hoy);
  const pendientes = porConfirmar(db, hoy);
  const proximos = turnosEntre(db, sumarDiasA(hoy, 1), sumarDiasA(hoy, 3)).filter((t) => t.status === 'confirmado');
  const pagos = pagosAConfirmar(db);
  const interesados = db.interesados.filter((i) => !i.archivedAt && i.estado === 'nuevo');

  return (
    <Pantalla ancho>
      <View>
        <TextoChico>{diaYFecha(hoy)}</TextoChico>
        <Titulo>{visitas.length === 0 ? 'Hoy no hay visitas' : `${visitas.length} ${visitas.length === 1 ? 'visita' : 'visitas'} hoy`}</Titulo>
      </View>

      <Seccion titulo="Turnos de hoy" accion={<Boton titulo="+ Turno" compacto variante="secundario" onPress={() => router.push('/medico/turno/nuevo')} />}>
        {visitas.length === 0 ? <Texto color={colors.textMuted}>No hay turnos para hoy.</Texto> : null}
        {visitas.map((t) => <TarjetaTurno key={t.id} turno={t} />)}
      </Seccion>

      {pendientes.length > 0 ? (
        <Seccion titulo="Por confirmar" bajada="Solicitudes nuevas y turnos pendientes">
          {pendientes.map((t) => (
            <View key={t.id} style={{ gap: 4 }}>
              <TextoChico>{diaYFecha(t.day)}</TextoChico>
              <TarjetaTurno turno={t} />
            </View>
          ))}
        </Seccion>
      ) : null}

      <Seccion titulo="Pagos a confirmar" accion={<Boton titulo="Membresías" compacto variante="contorno" onPress={() => router.navigate('/medico/membresias')} />}>
        {pagos.length === 0 ? <Texto color={colors.textMuted}>No hay pagos a confirmar.</Texto> : null}
        {pagos.map((p) => {
          const familia = db.families.find((f) => f.id === familiaDePago(db, p));
          return (
            <Tarjeta key={p.id} onPress={() => router.push({ pathname: '/medico/pago', params: { id: p.id } })} accessibilityLabel={`Pago a confirmar del ${fechaCorta(p.date)}`}>
              <TextoFuerte>{familia?.name ?? 'Familia sin identificar'}</TextoFuerte>
              <TextoChico>{fechaCorta(p.date)} · {p.currency} {p.amount.toLocaleString('es-AR')}</TextoChico>
            </Tarjeta>
          );
        })}
      </Seccion>

      {interesados.length > 0 ? (
        <Seccion titulo="Interesados nuevos" accion={<Boton titulo="Ver todos" compacto variante="contorno" onPress={() => router.navigate('/medico/interesados')} />}>
          {interesados.slice(0, 5).map((i) => (
            <Tarjeta key={i.id} onPress={() => router.navigate('/medico/interesados')} accessibilityLabel={`Interesado: ${i.nombre}`}>
              <TextoFuerte>{i.nombre}</TextoFuerte>
              <TextoChico>{fechaCorta(i.recibidoAt)}{i.zona ? ` · ${i.zona}` : ''}</TextoChico>
            </Tarjeta>
          ))}
        </Seccion>
      ) : null}

      <Seccion titulo="Próximos días" accion={<Boton titulo="Ver agenda" compacto variante="contorno" onPress={() => router.navigate('/medico/agenda')} />}>
        {proximos.length === 0 ? <Texto color={colors.textMuted}>No hay turnos confirmados en los próximos tres días.</Texto> : null}
        {proximos.map((t) => (
          <View key={t.id} style={{ gap: 4 }}>
            <TextoChico>{diaYFecha(t.day)}</TextoChico>
            <TarjetaTurno turno={t} />
          </View>
        ))}
      </Seccion>
    </Pantalla>
  );
}
