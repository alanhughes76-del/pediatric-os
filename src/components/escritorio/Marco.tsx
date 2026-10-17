/**
 * Armado para pantallas anchas (web en computadora, tablet apaisada):
 * barra lateral a la izquierda y barra superior arriba. En el teléfono no cambia
 * nada: se ve la pantalla con sus pestañas de abajo.
 *
 * Los módulos "Próximamente" se muestran en gris y no se pueden abrir
 * (decisión del Dr., 17/10/2026).
 */
import { useState, type ReactNode } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, useWindowDimensions } from 'react-native';
import { router, usePathname, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { Marca } from '@/components/Marca';
import { colors, fonts, size, ANCHO_ESCRITORIO } from '@/theme';

type NombreIcono = keyof typeof Ionicons.glyphMap;
type Rol = 'medico' | 'familia';

interface Item {
  texto: string;
  icono: NombreIcono;
  href: Href;
  /** El ítem queda marcado si la ruta actual empieza con alguno de estos prefijos. */
  activoEn: (ruta: string) => boolean;
}

const empieza = (...prefijos: string[]) => (ruta: string) => prefijos.some((p) => ruta === p || ruta.startsWith(`${p}/`));

const MENU: Record<Rol, Item[]> = {
  medico: [
    { texto: 'Hoy', icono: 'today-outline', href: '/medico', activoEn: (r) => r === '/medico' || empieza('/medico/seguimiento', '/medico/consulta')(r) },
    {
      texto: 'Pacientes',
      icono: 'people-outline',
      href: '/medico/pacientes',
      activoEn: empieza('/medico/pacientes', '/medico/hijo', '/medico/paciente', '/medico/adulto', '/medico/familia', '/medico/certificado'),
    },
    { texto: 'Fiebre', icono: 'thermometer-outline', href: '/medico/fiebre', activoEn: empieza('/medico/fiebre') },
    { texto: 'Membresías', icono: 'wallet-outline', href: '/medico/membresias', activoEn: empieza('/medico/membresias') },
    { texto: 'Registro de accesos', icono: 'list-outline', href: '/medico/accesos', activoEn: empieza('/medico/accesos') },
  ],
  familia: [
    { texto: 'Inicio', icono: 'home-outline', href: '/familia', activoEn: (r) => r === '/familia' || empieza('/familia/hijo')(r) },
    { texto: 'Pedir visita', icono: 'calendar-outline', href: '/familia/pedir', activoEn: empieza('/familia/pedir', '/familia/urgencia') },
    { texto: 'Fiebre', icono: 'thermometer-outline', href: '/familia/fiebre', activoEn: empieza('/familia/fiebre') },
    { texto: 'Membresía', icono: 'document-text-outline', href: '/familia/membresia', activoEn: empieza('/familia/membresia') },
  ],
};

const PROXIMAMENTE: { texto: string; icono: NombreIcono }[] = [
  { texto: 'Agenda', icono: 'calendar-outline' },
  { texto: 'Prescripciones', icono: 'medkit-outline' },
  { texto: 'Estudios', icono: 'flask-outline' },
  { texto: 'Comunicaciones', icono: 'chatbubbles-outline' },
  { texto: 'Reportes', icono: 'bar-chart-outline' },
  { texto: 'IA Asistente', icono: 'sparkles-outline' },
];

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
      {escritorio ? <BarraLateral rol={rol} /> : null}
      <View style={s.principal}>
        {escritorio ? <BarraSuperior rol={rol} /> : null}
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    </View>
  );
}

function BarraLateral({ rol }: { rol: Rol }) {
  const ruta = usePathname();
  const { salir } = useApp();
  return (
    <View style={s.lateral} accessibilityRole="menu">
      <View style={s.marca}><Marca claro /></View>

      <View style={{ gap: 2 }}>
        {MENU[rol].map((it) => {
          const activo = it.activoEn(ruta);
          return (
            <Pressable
              key={it.texto}
              onPress={() => router.navigate(it.href)}
              accessibilityRole="menuitem"
              accessibilityState={{ selected: activo }}
              style={({ pressed }) => [s.item, activo && s.itemActivo, pressed && !activo && s.itemApretado]}
            >
              <Ionicons name={it.icono} size={21} color={activo ? colors.white : colors.sidebarTexto} />
              <Text style={[s.itemTexto, activo && { color: colors.white }]}>{it.texto}</Text>
            </Pressable>
          );
        })}
      </View>

      {rol === 'medico' ? (
        <View style={{ gap: 2 }}>
          <Text style={s.grupo}>Próximamente</Text>
          {PROXIMAMENTE.map((it) => (
            <View key={it.texto} style={s.item} accessibilityState={{ disabled: true }} accessibilityLabel={`${it.texto}, próximamente`}>
              <Ionicons name={it.icono} size={21} color={colors.sidebarApagado} />
              <Text style={[s.itemTexto, { color: colors.sidebarApagado }]}>{it.texto}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ flex: 1 }} />
      <Pressable
        onPress={() => { salir(); router.replace('/'); }}
        accessibilityRole="button"
        accessibilityLabel="Cambiar de rol (modo prueba)"
        style={({ pressed }) => [s.item, pressed && s.itemApretado]}
      >
        <Ionicons name="swap-horizontal-outline" size={21} color={colors.sidebarTexto} />
        <Text style={s.itemTexto}>Cambiar rol</Text>
      </Pressable>
    </View>
  );
}

function BarraSuperior({ rol }: { rol: Rol }) {
  const { db, sesion } = useApp();
  const [busqueda, setBusqueda] = useState('');
  const nombre = sesion?.rol === 'familia' ? `${sesion.guardian.firstName} ${sesion.guardian.lastName}` : db.doctor.name;
  const detalle = rol === 'medico' ? 'Pediatra' : 'Adulto responsable';
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
        <Text style={s.saludo}>Portal de la familia</Text>
      )}
      <View style={{ flex: 1 }} />
      <View style={s.usuario}>
        <View style={s.avatar}><Text style={s.avatarTexto}>{iniciales}</Text></View>
        <View>
          <Text style={s.usuarioNombre}>{nombre}</Text>
          <Text style={s.usuarioDetalle}>{detalle}</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  raiz: { flex: 1, flexDirection: 'row', backgroundColor: colors.bg },
  principal: { flex: 1 },
  lateral: { width: 260, backgroundColor: colors.sidebar, paddingHorizontal: 14, paddingVertical: 22, gap: 22 },
  marca: { paddingHorizontal: 10, paddingBottom: 6 },
  grupo: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.sidebarApagado, letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 12, paddingBottom: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  itemActivo: { backgroundColor: colors.sidebarActivo },
  itemApretado: { backgroundColor: 'rgba(255,255,255,0.06)' },
  itemTexto: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.sidebarTexto },
  superior: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 28,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 520,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buscadorTexto: { flex: 1, fontFamily: fonts.body, fontSize: size.small + 1, color: colors.text, outlineStyle: 'none' } as object,
  saludo: { fontFamily: fonts.titleSemi, fontSize: 22, color: colors.primary },
  usuario: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.bgSoft, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primary },
  usuarioNombre: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.text },
  usuarioDetalle: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
});
