/**
 * Armado para pantallas anchas (web en computadora, tablet apaisada), prompt maestro 5.2:
 * - Médico: barra lateral con los 16 módulos (src/navegacion/modulos.ts) y, abajo, perfil,
 *   Configuración y Cerrar sesión. Encabezado con buscador, frase de marca, campana y nombre.
 * - Familia: sus cuatro secciones. Las dos caras llevan la marca "Dr. Alan Hughes - Pediatría Integral".
 * En el celular no se muestra nada de esto: se usan las pestañas de abajo.
 */
import { useState, type ReactNode } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet, useWindowDimensions } from 'react-native';
import { router, usePathname, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { avisosDelMedico } from '@/data/avisos';
import { CONFIGURACION, moduloActivo } from '@/navegacion/modulos';
import { modulosDe } from '@/navegacion/permisos';
import { useRolEquipo } from '@/navegacion/useRolEquipo';
import { Marca } from '@/components/Marca';
import { anilloFoco, colors, fonts, size, ANCHO_ESCRITORIO } from '@/theme';

type NombreIcono = keyof typeof Ionicons.glyphMap;
type Rol = 'medico' | 'familia';

/** true en pantallas anchas (barra lateral); false en el teléfono (pestañas). */
export function useEscritorio() {
  return useWindowDimensions().width >= ANCHO_ESCRITORIO;
}

export function Marco({ rol, children }: { rol: Rol; children: ReactNode }) {
  const escritorio = useEscritorio();
  // La pantalla (children) queda siempre en el mismo lugar del árbol: así, al girar
  // una tablet o achicar la ventana, la navegación no vuelve al inicio.
  return (
    <View style={s.raiz}>
      {escritorio ? (rol === 'medico' ? <LateralMedico /> : <LateralFamilia />) : null}
      <View style={s.principal}>
        {escritorio ? <BarraSuperior rol={rol} /> : null}
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    </View>
  );
}

function Item({ texto, icono, activo, onPress, detalle }: { texto: string; icono: NombreIcono; activo?: boolean; onPress: () => void; detalle?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityState={{ selected: !!activo }}
      accessibilityLabel={detalle ? `${texto}, ${detalle}` : texto}
      style={(e) => [s.item, activo && s.itemActivo, e.pressed && !activo && s.itemApretado, (e as { focused?: boolean }).focused && anilloFoco]}
    >
      <Ionicons name={icono} size={20} color={activo ? colors.primary : colors.sidebarTexto} />
      <Text style={[s.itemTexto, activo && s.itemTextoActivo]} numberOfLines={1}>{texto}</Text>
    </Pressable>
  );
}

function LateralMedico() {
  const ruta = usePathname();
  const { salir, db } = useApp();
  const rol = useRolEquipo();
  const activo = moduloActivo(ruta);
  return (
    <View style={s.lateral}>
      <View style={s.marca}><Marca claro /></View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 2 }} accessibilityRole="menu">
        {modulosDe(rol).map((m) => (
          <Item key={m.clave} texto={m.titulo} icono={m.icono} activo={activo === m.clave} detalle={m.pendiente ? `llega en la ${m.pendiente.etapa}` : undefined} onPress={() => router.navigate(m.href)} />
        ))}
      </ScrollView>

      <View style={s.pie}>
        <View style={s.perfil}>
          <View style={s.avatar}><Text style={s.avatarTexto}>{rol === 'medico' ? 'AH' : 'AS'}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.perfilNombre} numberOfLines={1}>{rol === 'medico' ? db.doctor.name : 'Asistente'}</Text>
            <Text style={s.perfilDetalle}>{rol === 'medico' ? 'Pediatra' : 'Administración'}</Text>
          </View>
        </View>
        {rol === 'medico' ? <Item texto={CONFIGURACION.titulo} icono={CONFIGURACION.icono} activo={activo === 'configuracion'} onPress={() => router.navigate(CONFIGURACION.href)} /> : null}
        <Item texto="Cerrar sesión" icono="log-out-outline" onPress={() => { salir(); router.replace('/'); }} />
      </View>
    </View>
  );
}

const MENU_FAMILIA: { texto: string; icono: NombreIcono; href: Href; rutas: string[] }[] = [
  { texto: 'Inicio', icono: 'home-outline', href: '/familia', rutas: ['/familia', '/familia/hijo'] },
  { texto: 'Pedir visita', icono: 'calendar-outline', href: '/familia/pedir', rutas: ['/familia/pedir', '/familia/urgencia'] },
  { texto: 'Fiebre', icono: 'thermometer-outline', href: '/familia/fiebre', rutas: ['/familia/fiebre'] },
  { texto: 'Mis datos', icono: 'person-outline', href: '/familia/membresia', rutas: ['/familia/membresia'] },
];

function LateralFamilia() {
  const ruta = usePathname();
  const { salir } = useApp();
  const activo = (rutas: string[]) => rutas.some((r) => (r === '/familia' ? ruta === r : ruta === r || ruta.startsWith(`${r}/`)));
  return (
    <View style={s.lateral}>
      <View style={s.marca}><Marca claro /></View>
      <View style={{ flex: 1, gap: 2 }} accessibilityRole="menu">
        {MENU_FAMILIA.map((it) => <Item key={it.texto} texto={it.texto} icono={it.icono} activo={activo(it.rutas)} onPress={() => router.navigate(it.href)} />)}
      </View>
      <View style={s.pie}>
        <Item texto="Cerrar sesión" icono="log-out-outline" onPress={() => { salir(); router.replace('/'); }} />
      </View>
    </View>
  );
}

function BarraSuperior({ rol }: { rol: Rol }) {
  const { db, sesion } = useApp();
  const [busqueda, setBusqueda] = useState('');
  const nombre = sesion?.rol === 'familia' ? `${sesion.guardian.firstName} ${sesion.guardian.lastName}` : sesion?.rol === 'asistente' ? 'Asistente' : db.doctor.name;
  const iniciales = nombre.replace(/^Dr\.\s*/, '').split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();

  const buscar = () => {
    router.navigate({ pathname: '/medico/pacientes', params: { q: busqueda.trim() } });
    setBusqueda('');
  };

  return (
    <View style={s.superior}>
      {rol === 'medico' ? (
        <View style={s.buscador}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            onSubmitEditing={buscar}
            placeholder="Buscar paciente: nombre, iniciales o dd/mm/aaaa"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Buscar paciente"
            style={s.buscadorTexto}
          />
        </View>
      ) : (
        <Text style={s.titulo}>Portal de la familia</Text>
      )}
      <View style={{ flex: 1 }} />
      {rol === 'medico' ? <Text style={s.frase}>Pequeños pacientes, grandes historias</Text> : null}
      {rol === 'medico' ? <Campana cantidad={avisosDelMedico(db).length} /> : null}
      <View style={s.usuario}>
        <View style={s.avatarClaro}><Text style={s.avatarClaroTexto}>{iniciales}</Text></View>
        <View>
          <Text style={s.usuarioNombre}>{nombre}</Text>
          <Text style={s.usuarioDetalle}>{rol === 'familia' ? 'Adulto responsable' : sesion?.rol === 'asistente' ? 'Administración' : 'Pediatra'}</Text>
        </View>
      </View>
    </View>
  );
}

function Campana({ cantidad }: { cantidad: number }) {
  return (
    <Pressable
      onPress={() => router.navigate('/medico/avisos')}
      accessibilityRole="button"
      accessibilityLabel={cantidad > 0 ? `Avisos: ${cantidad} pendientes` : 'Avisos: no hay pendientes'}
      style={(e) => [s.campana, (e as { focused?: boolean }).focused && anilloFoco]}
      hitSlop={6}
    >
      <Ionicons name="notifications-outline" size={24} color={colors.primary} />
      {cantidad > 0 ? <View style={s.contador}><Text style={s.contadorTexto}>{cantidad > 99 ? '99+' : cantidad}</Text></View> : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  raiz: { flex: 1, flexDirection: 'row', backgroundColor: colors.bg },
  principal: { flex: 1 },
  lateral: { width: 256, backgroundColor: colors.sidebar, paddingHorizontal: 12, paddingTop: 22, paddingBottom: 14, gap: 18 },
  marca: { paddingHorizontal: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 44, borderRadius: 999 },
  itemActivo: { backgroundColor: colors.accionSuave },
  itemApretado: { backgroundColor: colors.nocheSuave },
  itemTextoActivo: { fontFamily: fonts.bodyBold, color: colors.primary },
  itemTexto: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.sidebarTexto, flex: 1 },
  pie: { gap: 2 },
  perfil: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, marginBottom: 4, borderRadius: 20, backgroundColor: colors.nocheSuave },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.sidebarActivo, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.white },
  perfilNombre: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.white },
  perfilDetalle: { fontFamily: fonts.body, fontSize: 13, color: colors.sidebarTexto },
  superior: {
    height: 72, flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 28,
    // Blanco translúcido con desenfoque (en la web), como el encabezado de la app de Lovable.
    backgroundColor: 'rgba(255, 255, 255, 0.72)', backdropFilter: 'blur(16px)', borderBottomWidth: 1, borderBottomColor: colors.border, zIndex: 2,
  } as object,
  buscador: {
    // Se achica en pantallas de 1024 px para que la barra no se pase del borde.
    flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', maxWidth: 480, minWidth: 200, flexShrink: 1, height: 44,
    paddingHorizontal: 18, borderRadius: 999, backgroundColor: colors.muted,
  },
  buscadorTexto: { flex: 1, fontFamily: fonts.body, fontSize: size.base, color: colors.text, outlineStyle: 'none' } as object,
  titulo: { fontFamily: fonts.title, fontSize: 20, color: colors.primary },
  frase: { fontFamily: fonts.hand, fontSize: 22, color: colors.primary2, flexShrink: 1 },
  campana: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  contador: { position: 'absolute', top: 4, right: 2, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: colors.alert, alignItems: 'center', justifyContent: 'center' },
  contadorTexto: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.white },
  usuario: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  avatarClaro: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accionSuave, alignItems: 'center', justifyContent: 'center' },
  avatarClaroTexto: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.accionTexto },
  usuarioNombre: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  usuarioDetalle: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
});
