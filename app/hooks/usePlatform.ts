import { Platform } from 'react-native';

export const usePlatform = () => {
  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';
  
  return {
    isWeb,
    isAndroid,
    isIOS,
    platform: Platform.OS
  };
};