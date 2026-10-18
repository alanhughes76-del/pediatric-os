/**
 * Membresías y pagos (prompt maestro 7.16): estado de cada familia (primero lo que hay que atender)
 * y los pagos que llegaron por una automatización y falta confirmar.
 */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { contarMembresias, familiaDePago, filasMembresias, pagosAConfirmar } from '@/data/membresias';
import { membresiaDeFamilia, TEXTO_ESTADO_MEMBRESIA, type EstadoMembresia } from '@/data/selectores';
import { dinero } from '@/data/configuracion';
import { fechaCorta } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { Opciones } from '@/components/Formulario';
import { Tarjeta } from '@/components/Tarjeta';
import { Caja, Grilla } from '@/components/Caja';
import { EtiquetaMembresia } from '@/components/membresia/EtiquetaMembresia';
import { Titulo, Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { colors } from '@/theme';

type Filtro = 'atender' | 'activas' | 'todas';

export default function MembresiasMedico() {
  const { db } = useApp();
  const [filtro, setFiltro] = useState<Filtro>('atender');
  const filas = filasMembresias(db).filter((f) => f.estado !== 'sin-membresia');
  const cuenta = contarMembresias(filas);
  const atender: EstadoMembresia[] = ['vencida', 'suspendida', 'por-vencer'];
  const visibles = filas.filter((f) => (filtro === 'todas' ? true : filtro === 'activas' ? f.estado === 'activa' || f.estado === 'por-vencer' : atender.includes(f.estado)));
  const aConfirmar = pagosAConfirmar(db);
  const nombreFamilia = (id?: string) => db.families.find((f) => f.id === id)?.name ?? 'Familia sin identificar';

  return (
    <Pantalla ancho>
      <Titulo>Membresías y pagos</Titulo>
      <View style={s.cifras}>
        {(['activa', 'por-vencer', 'vencida', 'suspendida'] as EstadoMembresia[]).map((e) => (
          <Tarjeta key={e} style={s.cifra}>
            <TextoFuerte style={{ fontSize: 26 }}>{cuenta[e]}</TextoFuerte>
            <TextoChico>{TEXTO_ESTADO_MEMBRESIA[e]}</TextoChico>
          </Tarjeta>
        ))}
      </View>

      <Grilla>
        <Caja titulo="Familias con membresía" icono="wallet-outline" color="verde">
          <Opciones<Filtro> valor={filtro} onCambio={setFiltro}
            opciones={[{ valor: 'atender', texto: 'Para atender' }, { valor: 'activas', texto: 'Vigentes' }, { valor: 'todas', texto: 'Todas' }]} />
          {visibles.length === 0 ? <Texto color={colors.textMuted}>{filtro === 'atender' ? 'Nada para atender: todas al día.' : 'No hay membresías en esta lista.'}</Texto> : null}
          {visibles.map((f) => {
            const m = membresiaDeFamilia(db, f.familyId).membership;
            return (
              <Tarjeta key={f.familyId} style={s.fila} onPress={() => router.push(`/medico/familia/${f.familyId}`)} accessibilityLabel={`Abrir ${f.nombre}`}>
                <View style={{ flex: 1, gap: 4 }}>
                  <TextoFuerte>{f.nombre}</TextoFuerte>
                  {m ? <TextoChico>Plan {m.plan} · {f.estado === 'vencida' ? 'venció' : 'renueva'} el {fechaCorta(m.renewalDate)}</TextoChico> : null}
                  <EtiquetaMembresia estado={f.estado} />
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.primary3} />
              </Tarjeta>
            );
          })}
        </Caja>

        <Caja titulo={`Pagos a confirmar (${aConfirmar.length})`} icono="cash-outline" color="naranja">
          <TextoChico>Llegan por una automatización (el bot de Telegram, cuando se conecte en la Etapa 8). Cada uno se revisa y se confirma.</TextoChico>
          {aConfirmar.length === 0 ? <Texto color={colors.textMuted}>No hay pagos para confirmar.</Texto> : null}
          {aConfirmar.map((p) => (
            <Tarjeta key={p.id} style={s.fila} onPress={() => router.push({ pathname: '/medico/pago', params: { id: p.id } })} accessibilityLabel={`Revisar el pago del ${fechaCorta(p.date)}`}>
              <View style={{ flex: 1 }}>
                <TextoFuerte>{nombreFamilia(familiaDePago(db, p))}</TextoFuerte>
                <TextoChico>{fechaCorta(p.date)} · {p.concept ?? 'Pago'}</TextoChico>
              </View>
              <TextoFuerte>{dinero(p.amount, p.currency)}</TextoFuerte>
              <Ionicons name="chevron-forward" size={20} color={colors.primary3} />
            </Tarjeta>
          ))}
        </Caja>
      </Grilla>
      <TextoChico>Para cargar una membresía o un pago, abrí la familia. Los precios se cambian en Configuración.</TextoChico>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cifra: { flexGrow: 1, flexBasis: 140, gap: 2 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, boxShadow: 'none' },
});
