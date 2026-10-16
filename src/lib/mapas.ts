import { Linking } from 'react-native';

export const abrirEnGoogleMaps = (direccion: string) =>
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`);

export const abrirEnWaze = (direccion: string) =>
  Linking.openURL(`https://waze.com/ul?q=${encodeURIComponent(direccion)}&navigate=yes`);
