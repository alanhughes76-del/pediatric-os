import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Manrope_300Light,
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { Caveat_600SemiBold } from '@expo-google-fonts/caveat';
import { AppProvider } from '@/data/store';
import { AvisoDeError } from '@/components/AvisoDeError';
import { colors } from '@/theme';

export default function RootLayout() {
  const [listo] = useFonts({
    Manrope_300Light,
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Caveat_600SemiBold,
  });
  if (!listo) return null;

  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
        <AvisoDeError />
      </AppProvider>
    </SafeAreaProvider>
  );
}
