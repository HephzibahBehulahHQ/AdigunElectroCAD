interface AdigunElectroCadRuntimeConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseSchema: "adigunelectrocad";
  authRedirectUrl: string;
}

interface Window {
  ADIGUN_ELECTRO_CAD_RUNTIME_CONFIG?: AdigunElectroCadRuntimeConfig;
}
