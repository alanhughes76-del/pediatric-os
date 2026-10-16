/** Registro de fiebre de un hijo, del lado de la familia. */
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/data/store';
import { fiebreDe } from '@/data/selectores';
import { SignosDeAlarma } from '../SignosDeAlarma';
import { Boton } from '../Boton';
import { Seccion } from '../Seccion';
import { Tarjeta } from '../Tarjeta';
import { GraficoFiebre } from './GraficoFiebre';
import { ListaFiebre } from './ListaFiebre';

export function FiebreFamilia({ patientId }: { patientId: string }) {
  const { db } = useApp();
  const registros = fiebreDe(db, patientId);
  const nuevo = (tipo: 'toma' | 'antitermico') => router.push({ pathname: '/familia/fiebre/nuevo', params: { paciente: patientId, tipo } });

  return (
    <>
      <SignosDeAlarma />
      <View style={{ gap: 10 }}>
        <Boton titulo="Anotar temperatura" icono="thermometer-outline" onPress={() => nuevo('toma')} />
        <Boton titulo="Anotar antitérmico" icono="medkit-outline" variante="contorno" onPress={() => nuevo('antitermico')} />
      </View>
      <Seccion titulo="Curva de temperatura">
        <Tarjeta><GraficoFiebre registros={registros} /></Tarjeta>
      </Seccion>
      <Seccion titulo="Lo anotado">
        <ListaFiebre registros={registros} vista="familia" />
      </Seccion>
    </>
  );
}
