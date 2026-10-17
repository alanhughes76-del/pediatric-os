/**
 * Bloques "Contacto" y "Adultos responsables".
 * - Contacto: nombre, email, teléfono (E.164) y preferencia de contacto del adulto principal. Sin email no se puede habilitar el portal.
 * - Adultos: vínculos vigentes con su relación y domicilios; marcar principal, quitar vínculo
 *   (cierra el vínculo con la fecha de hoy, no se borra) y agregar un adulto (existente o nuevo).
 */
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/data/store';
import { adultoPrincipal, adultosDe, textoDomicilio, textoRelacion } from '@/data/selectores';
import { hoyISO } from '@/lib/fechas';
import { Seccion } from '../Seccion';
import { Tarjeta } from '../Tarjeta';
import { Etiqueta } from '../Etiqueta';
import { Boton } from '../Boton';
import { Aviso } from '../Formulario';
import { Texto, TextoFuerte, TextoChico } from '../Texto';
import { BotonTexto, CampoEditable, CampoTelefono, TEXTO_PREFERENCIA, validarEmail } from './piezas';
import { telefonoLegible } from '@shared/telefono';
import { colors } from '@/theme';

export function BloqueContacto({ patientId }: { patientId: string }) {
  const { db, actualizar } = useApp();
  const principal = adultoPrincipal(db, patientId);

  return (
    <Seccion titulo="Contacto">
      <Tarjeta style={{ gap: 12 }}>
        {!principal ? (
          <Texto color={colors.textMuted}>Todavía no hay un adulto responsable. Agregalo en el bloque siguiente.</Texto>
        ) : (
          <>
            <View>
              <TextoChico>Adulto principal</TextoChico>
              <TextoFuerte>{principal.guardian.firstName} {principal.guardian.lastName} <Texto color={colors.textMuted}>({textoRelacion(principal.rel)})</Texto></TextoFuerte>
            </View>
            <CampoEditable
              etiqueta="Email"
              valor={principal.guardian.email}
              keyboardType="email-address"
              placeholder="nombre@ejemplo.com"
              validar={validarEmail}
              onGuardar={(v) => actualizar('guardians', principal.guardian.id, { email: v }, 'adulto.email')}
            />
            <CampoTelefono valor={principal.guardian.phone} onGuardar={(v) => actualizar('guardians', principal.guardian.id, { phone: v }, 'adulto.telefono')} />
            {principal.guardian.contactPreference ? <TextoChico>Prefiere: {TEXTO_PREFERENCIA[principal.guardian.contactPreference]}</TextoChico> : null}
            {!principal.guardian.email ? <Aviso tono="alerta" texto="Sin email no se puede habilitar el portal para este adulto." /> : null}
          </>
        )}
      </Tarjeta>
    </Seccion>
  );
}

export function BloqueAdultos({ patientId }: { patientId: string }) {
  const { db, actualizar, enLote } = useApp();
  const adultos = adultosDe(db, patientId);
  const [confirmarQuitar, setConfirmarQuitar] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmarQuitar) return;
    const t = setTimeout(() => setConfirmarQuitar(null), 5000);
    return () => clearTimeout(t);
  }, [confirmarQuitar]);

  const marcarPrincipal = (relId: string) =>
    enLote((d, { log }) => {
      log({ action: 'vinculo.principal', entity: 'relationships', entityId: relId });
      return {
        ...d,
        relationships: d.relationships.map((r) => (r.patientId === patientId ? { ...r, isPrimary: r.id === relId } : r)),
      };
    });

  const quitar = (relId: string) => {
    if (confirmarQuitar !== relId) return setConfirmarQuitar(relId);
    actualizar('relationships', relId, { validTo: hoyISO(), isPrimary: false }, 'vinculo.quitar');
    setConfirmarQuitar(null);
  };

  return (
    <Seccion titulo="Adultos responsables">
      {adultos.length === 0 ? <Texto color={colors.textMuted}>Sin adultos vinculados.</Texto> : null}
      {adultos.map(({ rel, guardian: g, domicilios }) => (
        <Tarjeta key={rel.id} style={{ gap: 8 }}>
          <View style={s.fila}>
            <View style={{ flex: 1 }}>
              <TextoFuerte style={{ fontSize: 19 }}>{g.firstName} {g.lastName}</TextoFuerte>
              <TextoChico>{textoRelacion(rel)}{g.phone ? ` · ${telefonoLegible(g.phone)}` : ''}</TextoChico>
            </View>
            {rel.isPrimary ? <Etiqueta texto="Contacto principal" tono="azul" /> : null}
          </View>
          {domicilios.length === 0 ? <TextoChico>Sin domicilio cargado</TextoChico> : domicilios.map((a) => (
            <TextoChico key={a.id}>Domicilio: {textoDomicilio(a)}</TextoChico>
          ))}
          <View style={s.acciones}>
            <BotonTexto texto="Ver datos y domicilios" onPress={() => router.push(`/medico/adulto/${g.id}`)} />
            {!rel.isPrimary ? <BotonTexto texto="Marcar como principal" onPress={() => marcarPrincipal(rel.id)} /> : null}
            <BotonTexto
              texto={confirmarQuitar === rel.id ? 'Tocá de nuevo para quitar el vínculo' : 'Quitar vínculo'}
              tono={confirmarQuitar === rel.id ? 'alerta' : 'normal'}
              onPress={() => quitar(rel.id)}
            />
          </View>
        </Tarjeta>
      ))}
      <Boton titulo="+ Agregar adulto" variante="secundario" onPress={() => router.push({ pathname: '/medico/adulto/vincular', params: { paciente: patientId } })} />
    </Seccion>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 4 },
});
