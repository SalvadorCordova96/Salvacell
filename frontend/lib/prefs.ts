export type InterfaceView='home'|'summary'|'orders'|'quotes'|'payments'|'parts'|'pos'|'suppliers'|'data'|'settings';
export type UiPrefs={initialView:InterfaceView;orderFilter:'nueva'|'proceso'|'terminada'|'todas';density:'comfortable'|'compact';fontSize:'normal'|'large';hideModules:{suppliers:boolean;data:boolean;}};

export const defaultPrefs:UiPrefs={initialView:'home',orderFilter:'nueva',density:'comfortable',fontSize:'normal',hideModules:{suppliers:false,data:false}};

export function loadPrefs():UiPrefs{
 try{
  const raw=localStorage.getItem('salvacel-prefs');
  if(!raw)return defaultPrefs;
  const parsed=JSON.parse(raw) as Partial<UiPrefs>;
  return {...defaultPrefs,...parsed,hideModules:{...defaultPrefs.hideModules,...parsed.hideModules}};
 }catch{return defaultPrefs;}
}

export function savePrefs(prefs:UiPrefs){try{localStorage.setItem('salvacel-prefs',JSON.stringify(prefs));}catch{}}
