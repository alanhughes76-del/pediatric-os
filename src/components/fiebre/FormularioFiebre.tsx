/** Anotar una toma de temperatura o un antitérmico. La app nunca sugiere dosis. */
import { CampoFecha } from '@/components/CampoFecha';
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useApp } from '@/data/store';
import { antitermicoPrevio } from '@/data/selectores';
import type { Antipyretic, AntipyreticForm, ChildState, FeverSite, Improvement } from '@/data/types';
import { ACLARACION_DOSIS, PRESENTACIONES, TEXTO_DROGA, TEXTO_ESTADO, TEXTO_MEJORIA, TEXTO_SITIO, leerTemperatura, nombreAntitermico } from '@/lib/fiebre';
import { aCampos, ahoraISO, deCampos, hora, hoyISO } from '@/lib/fechas';
import { Campo, Opciones, Aviso } from '../Formulario';
import { Boton } from '../Boton';
import { SelectorTemperatura } from './SelectorTemperatura';

const opciones = <T extends string>(textos: Record<T, string>) => (Object.keys(textos) as T[]).map((v) => ({ valor: v, texto: textos[v] }));

export function FormularioFiebre({ patientId, tipo, porMedico = false, onListo }: {
  patientId: string;
  tipo: 'toma' | 'antitermico';
  porMedico?: boolean;
  onListo: () => void;
}) {
  const { db, agregar } = useApp();
  const ahora = aCampos(ahoraISO());
  const [fecha, setFecha] = useState(ahora.fecha);
  const [horaTxt, setHora] = useState(ahora.hora);
  const [temp, setTemp] = useState('');
  const [sitio, setSitio] = useState<FeverSite>('axilar');
  const [estado, setEstado] = useState<ChildState>();
  const [mejoria, setMejoria] = useState<Improvement>();
  const [nota, setNota] = useState('');
  const [droga, setDroga] = useState<Antipyretic>();
  const [dosis, setDosis] = useState('');
  const [presentacion, setPresentacion] = useState<AntipyreticForm>();
  const [nombreOtro, setNombreOtro] = useState('');
  const [intento, setIntento] = useState(false);

  const at = deCampos(fecha, horaTxt);
  const temperatura = leerTemperatura(temp);
  const previo = at && tipo === 'toma' ? antitermicoPrevio(db, patientId, at) : undefined;

  const errores = {
    fecha: !at ? 'Revisá la fecha y la hora (hh:mm).' : undefined,
    temp: tipo === 'toma' && temperatura == null ? 'Escribí la temperatura, por ejemplo 38,5.' : undefined,
    estado: tipo === 'toma' && !estado ? 'Elegí cómo está.' : undefined,
    droga: tipo === 'antitermico' && !droga ? 'Elegí el medicamento.' : undefined,
    presentacion: tipo === 'antitermico' && droga && PRESENTACIONES[droga] && !presentacion ? 'Elegí la presentación.' : undefined,
    nombreOtro: tipo === 'antitermico' && droga === 'otro' && !nombreOtro.trim() ? 'Escribí el nombre del medicamento.' : undefined,
  };
  const valido = !Object.values(errores).some(Boolean);

  const guardar = () => {
    setIntento(true);
    if (!valido || !at) return;
    if (tipo === 'toma') {
      agregar('fever', {
        patientId, kind: 'toma', at, temperatureC: temperatura, site: sitio, state: estado,
        improvement: previo ? mejoria : undefined, note: nota.trim() || undefined, enteredByDoctor: porMedico || undefined,
      }, 'fiebre.toma');
    } else {
      agregar('fever', {
        patientId, kind: 'antitermico', at, drug: droga,
        drugForm: droga && PRESENTACIONES[droga] ? presentacion : undefined,
        drugName: droga === 'otro' ? nombreOtro.trim() : undefined,
        dose: dosis.trim() || undefined, enteredByDoctor: porMedico || undefined,
      }, 'fiebre.antitermico');
    }
    onListo();
  };

  return (
    <View style={{ gap: 18 }}>
      <View style={s.fila}>
        <View style={{ flex: 3 }}><CampoFecha etiqueta="Fecha" value={fecha} onChangeText={setFecha} maximo={hoyISO()} /></View>
        <View style={{ flex: 2 }}><Campo etiqueta="Hora" value={horaTxt} onChangeText={setHora} placeholder="hh:mm" keyboardType="numbers-and-punctuation" /></View>
      </View>
      {intento && errores.fecha ? <Aviso tono="alerta" texto={errores.fecha} /> : null}

      {tipo === 'toma' ? (
        <>
          <SelectorTemperatura valor={temp} onCambio={setTemp} error={intento ? errores.temp : undefined} />
          <Opciones etiqueta="¿Dónde se midió?" opciones={opciones(TEXTO_SITIO)} valor={sitio} onCambio={setSitio} />
          <Opciones etiqueta="¿Cómo está?" columna opciones={opciones(TEXTO_ESTADO)} valor={estado} onCambio={setEstado} />
          {intento && errores.estado ? <Aviso tono="alerta" texto={errores.estado} /> : null}
          {previo ? (
            <Opciones
              etiqueta={`Le diste ${nombreAntitermico(previo).toLowerCase()} a las ${hora(previo.at)}. ¿Mejoró su ánimo y su aspecto?`}
              columna
              opciones={opciones(TEXTO_MEJORIA)}
              valor={mejoria}
              onCambio={setMejoria}
            />
          ) : null}
          <Campo etiqueta="Nota (opcional)" value={nota} onChangeText={setNota} multiline style={{ minHeight: 90 }} />
        </>
      ) : (
        <>
          <Opciones etiqueta="Medicamento" opciones={opciones(TEXTO_DROGA)} valor={droga} onCambio={(v) => { setDroga(v); setPresentacion(undefined); }} />
          {intento && errores.droga ? <Aviso tono="alerta" texto={errores.droga} /> : null}
          {droga && PRESENTACIONES[droga] ? (
            <Opciones etiqueta="Presentación" opciones={PRESENTACIONES[droga]!} valor={presentacion} onCambio={setPresentacion} />
          ) : null}
          {intento && errores.presentacion ? <Aviso tono="alerta" texto={errores.presentacion} /> : null}
          {droga === 'otro' ? (
            <Campo etiqueta="¿Cuál?" value={nombreOtro} onChangeText={setNombreOtro} placeholder="Nombre del medicamento" error={intento ? errores.nombreOtro : undefined} />
          ) : null}
          <Campo etiqueta="Dosis" value={dosis} onChangeText={setDosis} placeholder="Ej.: 5 ml" ayuda={ACLARACION_DOSIS} />
        </>
      )}

      <Boton titulo="Guardar" icono="checkmark" onPress={guardar} />
      <Boton titulo="Cancelar" variante="contorno" onPress={onListo} />
      {porMedico ? <Aviso texto="Queda anotado como registro a mano del médico." /> : null}
    </View>
  );
}

const s = StyleSheet.create({ fila: { flexDirection: 'row', gap: 12 } });
