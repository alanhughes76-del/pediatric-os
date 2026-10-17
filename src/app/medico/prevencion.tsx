/**
 * Prevención y educación (prompt maestro 7.12): la biblioteca de materiales que carga el Dr.
 * (PDF o enlace), etiquetados por edad y tema. Desde la ficha de cada paciente se sugieren según
 * la edad y se envían. Nada se genera: solo lo que cargaste.
 */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useApp } from '@/data/store';
import { biblioteca, enlaceValido, textoEdades } from '@/data/prevencion';
import type { EducationalMaterial } from '@/data/types';
import { elegirArchivo } from '@/lib/archivos';
import { ahoraISO } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { Titulo, Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { Tarjeta } from '@/components/Tarjeta';
import { Etiqueta } from '@/components/Etiqueta';
import { Boton } from '@/components/Boton';
import { Campo, Opciones, Aviso } from '@/components/Formulario';
import { EstadoVacio } from '@/components/Estados';
import { BotonTexto } from '@/components/ficha/piezas';
import { colors } from '@/theme';

const mesesOpcional = (t: string): number | undefined | null => {
  if (!t.trim()) return undefined;
  const n = Number(t.trim());
  return Number.isInteger(n) && n >= 0 && n <= 228 ? n : null;
};

export default function Prevencion() {
  const { db, archivos, actualizar } = useApp();
  const lista = biblioteca(db);
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<EducationalMaterial['kind']>('enlace');
  const [url, setUrl] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [temas, setTemas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tono: 'info' | 'alerta'; texto: string } | null>(null);
  const limpiar = () => { setTitulo(''); setUrl(''); setDesde(''); setHasta(''); setTemas(''); };

  const guardar = async () => {
    setMensaje(null);
    const d = mesesOpcional(desde);
    const h = mesesOpcional(hasta);
    if (!titulo.trim()) return setMensaje({ tono: 'alerta', texto: 'Escribí el título.' });
    if (d === null || h === null || (d !== undefined && h !== undefined && h < d)) return setMensaje({ tono: 'alerta', texto: 'Revisá las edades: en meses, de 0 a 228, y "hasta" mayor que "desde".' });
    if (tipo === 'enlace' && !enlaceValido(url)) return setMensaje({ tono: 'alerta', texto: 'Pegá un enlace que empiece con https://' });
    const archivo = tipo === 'pdf' ? await elegirArchivo() : undefined;
    if (tipo === 'pdf' && !archivo) return;
    if (archivo && archivo.mimeType !== 'application/pdf') return setMensaje({ tono: 'alerta', texto: 'Para un material, elegí un PDF.' });
    setGuardando(true);
    const error = await archivos.guardarMaterial({
      title: titulo.trim(), kind: tipo, url: tipo === 'enlace' ? url.trim() : undefined, ageFromMonths: d, ageToMonths: h,
      topics: temas.split(',').map((t) => t.trim()).filter(Boolean),
    }, archivo ?? undefined);
    setGuardando(false);
    if (error) return setMensaje({ tono: 'alerta', texto: error });
    setMensaje({ tono: 'info', texto: 'Material guardado en la biblioteca.' });
    limpiar();
    setAbierto(false);
  };

  return (
    <Pantalla ancho>
      <Titulo>Prevención</Titulo>
      <TextoChico>Tu biblioteca para las familias. En la ficha de cada paciente se sugieren los de su edad (pestaña Plan de cuidado).</TextoChico>
      {mensaje ? <Aviso tono={mensaje.tono} texto={mensaje.texto} /> : null}
      {lista.length === 0 ? <EstadoVacio icono="leaf-outline" color="naranja" titulo="Todavía no cargaste materiales" texto="Subí un PDF o pegá un enlace, con la edad y los temas." /> : null}
      {lista.map((m) => <ItemMaterial key={m.id} material={m} onArchivar={() => actualizar('educationalMaterials', m.id, { archivedAt: ahoraISO() }, 'material.archivar')} />)}

      {!abierto ? (
        <Boton titulo="+ Agregar material" variante="secundario" onPress={() => setAbierto(true)} />
      ) : (
        <Tarjeta style={{ gap: 14, borderColor: colors.primary3 }}>
          <Campo etiqueta="Título" value={titulo} onChangeText={setTitulo} placeholder="Sueño seguro del bebé" />
          <Opciones etiqueta="Tipo" opciones={[{ valor: 'enlace', texto: 'Enlace' }, { valor: 'pdf', texto: 'PDF' }]} valor={tipo} onCambio={setTipo} />
          {tipo === 'enlace' ? <Campo etiqueta="Enlace" value={url} onChangeText={setUrl} placeholder="https://…" autoCapitalize="none" keyboardType="url" /> : null}
          <View style={s.fila}>
            <View style={s.mitad}><Campo etiqueta="Desde (meses)" value={desde} onChangeText={(v) => setDesde(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="0" /></View>
            <View style={s.mitad}><Campo etiqueta="Hasta (meses)" value={hasta} onChangeText={(v) => setHasta(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="12" /></View>
          </View>
          <TextoChico>Vacío = cualquier edad. 24 meses = 2 años; 60 meses = 5 años.</TextoChico>
          <Campo etiqueta="Temas (separados por coma)" value={temas} onChangeText={setTemas} placeholder="sueño, lactancia" />
          <Boton titulo={guardando ? 'Guardando…' : tipo === 'pdf' ? 'Elegir el PDF y guardar' : 'Guardar'} icono="checkmark" deshabilitado={guardando} onPress={() => void guardar()} />
          <Boton titulo="Cancelar" variante="contorno" onPress={() => { setAbierto(false); setMensaje(null); }} />
        </Tarjeta>
      )}
    </Pantalla>
  );
}

function ItemMaterial({ material: m, onArchivar }: { material: EducationalMaterial; onArchivar: () => void }) {
  const { archivos } = useApp();
  const [error, setError] = useState<string | null>(null);
  return (
    <Tarjeta style={{ gap: 6 }}>
      <View style={s.fila}>
        <TextoFuerte style={{ flex: 1 }}>{m.title}</TextoFuerte>
        <Etiqueta texto={m.kind === 'pdf' ? 'PDF' : 'Enlace'} tono="naranja" />
      </View>
      <TextoChico>{textoEdades(m)}{m.topics.length > 0 ? ` · ${m.topics.join(', ')}` : ''}</TextoChico>
      {m.kind === 'enlace' && m.url ? <Texto numberOfLines={1} style={{ fontSize: 14 }} color={colors.textMuted}>{m.url}</Texto> : null}
      <View style={s.acciones}>
        <BotonTexto texto="Ver" onPress={() => void archivos.abrirMaterial(m).then(setError)} />
        <BotonTexto texto="Archivar" onPress={onArchivar} />
      </View>
      {error ? <Aviso tono="alerta" texto={error} /> : null}
    </Tarjeta>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  mitad: { flex: 1, minWidth: 140 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 4 },
});
