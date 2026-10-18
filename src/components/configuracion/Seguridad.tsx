/**
 * Segundo factor del médico (prompt maestro 4: "la opción más segura y de menor costo"): un código
 * de 6 números de una app de autenticación (TOTP), sin costo por uso como los SMS. Una vez activado,
 * Firebase lo pide en cada ingreso. Para quitarlo (por ejemplo, si se pierde el teléfono):
 * scripts/quitar-segundo-factor.ts (docs/INSTALACION.md).
 */
import { useState } from 'react';
import { Linking, Platform, View, StyleSheet } from 'react-native';
import { useApp } from '@/data/store';
import { claveEnGrupos } from '@/lib/segundoFactor';
import { CodigoQR } from '../CodigoQR';
import { Campo, Aviso } from '../Formulario';
import { Boton } from '../Boton';
import { Texto, TextoFuerte, TextoChico } from '../Texto';
import { ErrorComprensible } from '../Estados';

export function Seguridad() {
  const { seguridad } = useApp();
  const [alta, setAlta] = useState<{ clave: string; url: string } | null>(null);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [listo, setListo] = useState(false);

  const empezar = async () => {
    setTrabajando(true); setError(null);
    const r = await seguridad.prepararAlta();
    setTrabajando(false);
    if ('error' in r) return setError(r.error);
    setAlta(r);
  };
  const confirmar = async () => {
    setTrabajando(true);
    const e = await seguridad.confirmarAlta(codigo);
    setTrabajando(false);
    if (e) return setError(e);
    setAlta(null); setCodigo(''); setError(null); setListo(true);
  };

  if (seguridad.noDisponible) {
    return (
      <View style={s.col}>
        <Texto>Con el segundo factor, además de la contraseña, para entrar hace falta el código de 6 números de una app de autenticación en tu teléfono.</Texto>
        <Aviso texto={seguridad.noDisponible} />
      </View>
    );
  }

  if (seguridad.factores.length > 0) {
    return (
      <View style={s.col}>
        {listo ? <Aviso icono="checkmark-circle-outline" texto="Listo: desde ahora, al entrar se te pide el código de la app." /> : null}
        <TextoFuerte>Segundo factor activado</TextoFuerte>
        {seguridad.factores.map((f) => <Texto key={f.desde}>{f.nombre} · desde {new Date(f.desde).toLocaleDateString('es-AR')}</Texto>)}
        <TextoChico>Si perdés el teléfono, quien administra el proyecto lo quita (docs/INSTALACION.md) y lo volvés a activar acá.</TextoChico>
      </View>
    );
  }

  return (
    <View style={s.col}>
      <Texto>Además de la contraseña, para entrar te va a pedir el código de 6 números de una app de autenticación (Google Authenticator, 1Password, la de Apple…). Es lo más seguro y no tiene costo.</Texto>
      {!alta ? (
        <Boton titulo={trabajando ? 'Preparando…' : 'Activar el segundo factor'} icono="shield-checkmark-outline" deshabilitado={trabajando} onPress={() => void empezar()} />
      ) : (
        <>
          <TextoFuerte>1. Agregá Pediatric OS en la app de autenticación</TextoFuerte>
          {Platform.OS === 'web' ? (
            <View style={s.qr}><CodigoQR texto={alta.url} accessibilityLabel="Código QR para la app de autenticación" /></View>
          ) : (
            <Boton titulo="Abrir la app de autenticación" icono="open-outline" variante="secundario" onPress={() => void Linking.openURL(alta.url).catch(() => setError('No encontramos una app de autenticación. Instalá una y usá la clave de abajo.'))} />
          )}
          <TextoChico>{Platform.OS === 'web' ? 'Escanealo con la app.' : 'O agregala a mano con esta clave:'} Clave: {claveEnGrupos(alta.clave)}</TextoChico>
          <TextoFuerte>2. Escribí el código que muestra</TextoFuerte>
          <Campo etiqueta="Código de 6 números" value={codigo} onChangeText={setCodigo} keyboardType="number-pad" autoComplete="one-time-code" maxLength={7} onSubmitEditing={() => void confirmar()} />
          <Boton titulo={trabajando ? 'Verificando…' : 'Confirmar'} icono="checkmark" deshabilitado={trabajando} onPress={() => void confirmar()} />
          <Boton titulo="Cancelar" variante="contorno" compacto onPress={() => { setAlta(null); setCodigo(''); setError(null); }} />
        </>
      )}
      {error ? <ErrorComprensible texto={error} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  col: { gap: 12 },
  qr: { alignSelf: 'flex-start', padding: 8, backgroundColor: '#FFFFFF', borderRadius: 12 },
});
