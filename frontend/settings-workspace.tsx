'use client';

import { Tabs } from '@heroui/react';
import { Database, FileText, Palette, ShieldCheck, Wrench } from 'lucide-react';
import { InterfacePreferences, SettingsForm } from './settings';
import { CatalogSettings } from './settings-catalog';
import { AdvancedSettings } from './settings-advanced';
import { WarrantySettings } from './warranty-settings';
import { RecoverySnapshots } from './recovery-snapshots';
import { UserAccess } from './user-access';
import type { BootData } from './types';
import type { Mutation, Theme } from './ui';
import type { UiPrefs } from '@/lib/prefs';

type Props = {
  data: BootData;
  mutate: (payload: Mutation) => Promise<{ id: number }>;
  notify: (message: string) => void;
  theme: Theme;
  setTheme: (value: Theme) => void;
  prefs: UiPrefs;
  setPrefs: (value: UiPrefs) => void;
  actorId: number;
  actorPermissions: string[];
  canManageSettings: boolean;
  canManageUsers: boolean;
  canManageBackups: boolean;
  canAdminManage: boolean;
};

const tabs = [
  { id: 'general', label: 'Taller e interfaz', description: 'Datos, tickets, preferencias', icon: Wrench },
  { id: 'catalogs', label: 'Catálogos', description: 'Marcas, servicios, pagos', icon: Database },
  { id: 'warranty', label: 'Garantías', description: 'Reglas y seguimiento', icon: FileText },
  { id: 'security', label: 'Datos y seguridad', description: 'Acceso, respaldo, recuperación', icon: ShieldCheck },
];

export function SettingsWorkspace({ data, mutate, notify, theme, setTheme, prefs, setPrefs, actorId, actorPermissions, canManageSettings, canManageUsers, canManageBackups, canAdminManage }: Props) {
  const availableTabs = tabs.filter(tab => tab.id === 'security' ? canManageSettings || canManageUsers || canManageBackups : canManageSettings);
  const initialTab = canManageSettings ? 'general' : 'security';
  return <div className="settings-workspace">
    <Tabs className="settings-tabs" defaultSelectedKey={initialTab}>
      <Tabs.ListContainer className="settings-tabs-container">
        <Tabs.List aria-label="Áreas de configuración" className="settings-tabs-list">
          {availableTabs.map(({ id, label, description, icon: Icon }) => <Tabs.Tab key={id} id={id} aria-label={label} className="settings-tab">
            <Icon size={16} aria-hidden="true" /><span className="settings-tab-copy"><strong>{label}</strong><small>{description}</small></span><Tabs.Indicator />
          </Tabs.Tab>)}
        </Tabs.List>
      </Tabs.ListContainer>
      {canManageSettings && <Tabs.Panel id="general" className="settings-tab-panel">
        <SettingsForm settings={data.settings} mutate={mutate} notify={notify} theme={theme} setTheme={setTheme} />
        <InterfacePreferences prefs={prefs} setPrefs={setPrefs} />
      </Tabs.Panel>}
      {canManageSettings && <Tabs.Panel id="catalogs" className="settings-tab-panel">
        <CatalogSettings data={data} mutate={mutate} notify={notify} />
      </Tabs.Panel>}
      {canManageSettings && <Tabs.Panel id="warranty" className="settings-tab-panel">
        <WarrantySettings key={`warranty-${data.settings.revision}`} settings={data.settings} mutate={mutate} notify={notify} />
      </Tabs.Panel>}
      <Tabs.Panel id="security" className="settings-tab-panel">
        {canManageSettings && <AdvancedSettings settings={data.settings} mutate={mutate} notify={notify} />}
        {canManageUsers && <UserAccess actorId={actorId} actorPermissions={actorPermissions} canAdminManage={canAdminManage} notify={notify} />}
        {canManageBackups && <RecoverySnapshots />}
      </Tabs.Panel>
    </Tabs>
    <p className="settings-workspace-note"><Palette size={15} aria-hidden="true" /> Los cambios de cada área se guardan con sus propios controles; cambiar de pestaña no guarda nada automáticamente.</p>
  </div>;
}
