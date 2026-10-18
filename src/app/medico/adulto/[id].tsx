/**
 * Ficha del adulto responsable: datos de contacto, sus domicilios y los chicos vinculados
 * (un adulto puede estar vinculado a varios hermanos). Los domicilios se archivan, no se borran.
 */
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { pacientesVinculados, textoDomicilio, textoRelacion, nombreCompleto } from '@/data/selectores';
import { ahoraISO } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { Seccion } from '@/components/Seccion';
import { Tarjeta } from '@/components/Tarjeta';
import { Campo, Interruptor, Aviso, Opciones } from '@/components/Formulario';
import type { ContactPreference } from '@/data/types';
import { Titulo, Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { Agregar, BotonTexto, CampoEditable, CampoTelefono, TEXTO_PREFERENCIA, validarEmail } from '@/components/ficha/piezas';
import { colors } from '@/theme';
import { useRolEquipo } from '@/navegacion/useRolEquipo';
import { rutaDelPaciente } from '@/navegacion/permisos';

export default function Adulto() {
  const rol = useRolEquipo();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, actualizar, agregar } = useApp();
  const g = db.guardians.find((x) => x.id === id);
  const [calle, setCalle] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string>();
  const [confirmarArchivar, setConfirmarArchivar] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmarArchivar) return;
    const t = setTimeout(() => setConfirmarArchivar(null), 5000);
    return () => clearTimeout(t);
  }, [confirmarArchivar]);

  if (!g) return <Pantalla><Texto>No encontramos a este adulto.</Texto></Pantalla>;

  const domicilios = db.addresses.filter((a) => a.guardianId === g.id && !a.archivedAt);
  const chicos = pacientesVinculados(db, g.id);
  const familia = db.families.find((f) => f.id === g.familyId);

  const archivar = (addressId: string) => {
    if (confirmarArchivar !== addressId) return setConfirmarArchivar(addressId);
    actualizar('addresses', addressId, { archivedAt: ahoraISO() }, 'domicilio.archivar');
    setConfirmarArchivar(null);
  };

  return (
    <Pantalla>
      <Stack.Screen options={{ title: `${g.firstName} ${g.lastName}` }} />
      <View>
        <Titulo>{g.firstName} {g.lastName}</Titulo>
        {familia ? <TextoChico>{familia.name}</TextoChico> : null}
      </View>

      <Seccion titulo="Datos">
        <Tarjeta style={{ gap: 12 }}>
          <CampoEditable etiqueta="Nombre" valor={g.firstName} validar={(v) => (!v ? 'Escribí el nombre.' : undefined)}
            onGuardar={(v) => actualizar('guardians', g.id, { firstName: v }, 'adulto.nombre')} />
          <CampoEditable etiqueta="Apellido" valor={g.lastName} validar={(v) => (!v ? 'Escribí el apellido.' : undefined)}
            onGuardar={(v) => actualizar('guardians', g.id, { lastName: v }, 'adulto.apellido')} />
          <CampoEditable etiqueta="Email" valor={g.email} keyboardType="email-address" validar={validarEmail}
            onGuardar={(v) => actualizar('guardians', g.id, { email: v }, 'adulto.email')} />
          <CampoTelefono valor={g.phone} onGuardar={(v) => actualizar('guardians', g.id, { phone: v }, 'adulto.telefono')} />
          <Opciones<ContactPreference>
            etiqueta="Prefiere que lo contacten por"
            opciones={(Object.keys(TEXTO_PREFERENCIA) as ContactPreference[]).map((v) => ({ valor: v, texto: TEXTO_PREFERENCIA[v] }))}
            valor={g.contactPreference}
            onCambio={(v) => actualizar('guardians', g.id, { contactPreference: v }, 'adulto.preferencia')}
          />
        </Tarjeta>
      </Seccion>

      <Seccion titulo="Portal de la familia" bajada="Nadie se registra solo: lo habilitás vos, sea del ámbito que sea">
        <Tarjeta style={{ gap: 10 }}>
          {g.email ? (
            <>
              {/* Habilitar el portal es decisión del médico (también en las reglas). */}
              {rol === 'medico' ? (
                <Interruptor
                  texto="Puede entrar al portal"
                  activo={g.accessEnabled}
                  onCambio={(v) => actualizar('guardians', g.id, { accessEnabled: v }, v ? 'adulto.habilitar-portal' : 'adulto.deshabilitar-portal')}
                />
              ) : null}
              <TextoChico>{g.accessEnabled ? `Entra con un enlace que le llega a ${g.email}.` : 'No puede entrar al portal.'}</TextoChico>
            </>
          ) : (
            <Aviso tono="alerta" texto="Sin email no se puede habilitar el portal. Cargalo arriba." />
          )}
        </Tarjeta>
      </Seccion>

      <Seccion titulo="Domicilios" bajada="La visita va al domicilio del adulto que corresponda">
        {domicilios.length === 0 ? <Texto color={colors.textMuted}>Sin domicilios cargados.</Texto> : null}
        {domicilios.map((a) => (
          <Tarjeta key={a.id} style={s.fila}>
            <Ionicons name="location-outline" size={22} color={colors.primary2} />
            <View style={{ flex: 1 }}>
              <Texto>{textoDomicilio(a)}</Texto>
              {a.notes ? <TextoChico>{a.notes}</TextoChico> : null}
            </View>
            <BotonTexto
              texto={confirmarArchivar === a.id ? 'Tocá de nuevo' : 'Archivar'}
              tono={confirmarArchivar === a.id ? 'alerta' : 'normal'}
              onPress={() => archivar(a.id)}
            />
          </Tarjeta>
        ))}
        <Agregar
          titulo="Agregar domicilio"
          alCancelar={() => { setCalle(''); setLocalidad(''); setNotas(''); setError(undefined); }}
          guardar={() => {
            if (!calle.trim() || !localidad.trim()) { setError('Completá la calle y la localidad.'); return false; }
            agregar('addresses', { guardianId: g.id, street: calle.trim(), locality: localidad.trim(), notes: notas.trim() || undefined }, 'domicilio.agregar');
            setCalle(''); setLocalidad(''); setNotas(''); setError(undefined);
            return true;
          }}
        >
          <Campo etiqueta="Calle y número" value={calle} onChangeText={setCalle} placeholder="Av. Maipú 1450, 3.º B" error={error && !calle.trim() ? error : undefined} />
          <Campo etiqueta="Localidad" value={localidad} onChangeText={setLocalidad} placeholder="Vicente López" error={error && !localidad.trim() ? error : undefined} />
          <Campo etiqueta="Indicaciones (opcional)" value={notas} onChangeText={setNotas} placeholder="Timbre, piso, referencias" />
        </Agregar>
      </Seccion>

      <Seccion titulo="Chicos vinculados">
        {chicos.length === 0 ? <Texto color={colors.textMuted}>No tiene chicos vinculados.</Texto> : null}
        {chicos.map(({ rel, paciente }) => (
          <Tarjeta key={rel.id} style={s.fila} onPress={() => router.push(rutaDelPaciente(rol, paciente))} accessibilityLabel={`Abrir la ficha de ${paciente.firstName}`}>
            <View style={{ flex: 1 }}>
              <TextoFuerte>{nombreCompleto(paciente)}</TextoFuerte>
              <TextoChico>{textoRelacion(rel)}{rel.isPrimary ? ' · contacto principal' : ''}</TextoChico>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.primary3} />
          </Tarjeta>
        ))}
      </Seccion>
    </Pantalla>
  );
}

const s = StyleSheet.create({ fila: { flexDirection: 'row', alignItems: 'center', gap: 10 } });
