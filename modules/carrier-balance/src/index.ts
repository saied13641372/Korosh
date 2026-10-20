import {NativeModules, Platform} from 'react-native';

const Native = NativeModules.CarrierBalanceModule;

export const CarrierBalance = {
  available: Platform.OS === 'android' && !!Native,
  getCarrier: (): Promise<any> => Native?.getCarrier?.() ?? Promise.resolve({supported:false,carrier:'',subscriptionId:-1}),
  query: (kind:'balance'|'data'): Promise<any> => Native?.query?.(kind) ?? Promise.resolve({ok:false,error:'MODULE_UNAVAILABLE'}),
};
