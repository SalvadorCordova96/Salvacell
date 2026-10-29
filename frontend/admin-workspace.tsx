'use client';

import { Tabs } from '@heroui/react';
import { Database, Package, Truck } from 'lucide-react';
import { DataView } from './data-view';
import { PosView } from './pos';
import { SupplierView } from './suppliers';
import type { BootData } from './types';
import type { Mutation } from './ui';

type Props = {
  data: BootData;
  mutate: (payload: Mutation) => Promise<{ id: number; data: BootData }>;
  notify: (message: string) => void;
  openOrder: (id: number) => void;
  canManageData: boolean;
  canManageInventory: boolean;
  canManageSuppliers: boolean;
  assistantDraft?: Record<string, string> | null;
  clearAssistantDraft: () => void;
};

export function AdminWorkspace({ data, mutate, notify, openOrder, canManageData, canManageInventory, canManageSuppliers, assistantDraft, clearAssistantDraft }: Props) {
  const tabs = [
    ...(canManageInventory ? [{ id: 'products', label: 'Productos e inventario', description: 'Catálogo, existencias y reabasto', icon: Package }] : []),
    ...(canManageSuppliers ? [{ id: 'suppliers', label: 'Directorio de proveedores', description: 'Contactos y clasificación', icon: Truck }] : []),
    ...(canManageData ? [{ id: 'data', label: 'Datos del taller', description: 'Consultas y exportaciones', icon: Database }] : []),
  ];
  const initialTab = assistantDraft && canManageInventory ? 'products' : tabs[0]?.id;

  return <div className="settings-workspace admin-workspace">
    <Tabs className="settings-tabs" defaultSelectedKey={initialTab}>
      <Tabs.ListContainer className="settings-tabs-container">
        <Tabs.List aria-label="Áreas de administración" className="settings-tabs-list">
          {tabs.map(({ id, label, description, icon: Icon }) => <Tabs.Tab key={id} id={id} aria-label={label} className="settings-tab">
            <Icon size={16} aria-hidden="true" /><span className="settings-tab-copy"><strong>{label}</strong><small>{description}</small></span><Tabs.Indicator />
          </Tabs.Tab>)}
        </Tabs.List>
      </Tabs.ListContainer>
      {canManageInventory && <Tabs.Panel id="products" className="settings-tab-panel">
        <PosView key={`admin-catalog-${assistantDraft?.__openToken || 'regular'}`} data={data} mutate={mutate} notify={notify} printSale={() => undefined} canManageInventory catalogOnly assistantDraft={assistantDraft} clearAssistantDraft={clearAssistantDraft} />
      </Tabs.Panel>}
      {canManageSuppliers && <Tabs.Panel id="suppliers" className="settings-tab-panel">
        <SupplierView data={data} mutate={mutate} notify={notify} directoryOnly canManageDirectory />
      </Tabs.Panel>}
      {canManageData && <Tabs.Panel id="data" className="settings-tab-panel">
        <DataView data={data} openOrder={openOrder} />
      </Tabs.Panel>}
    </Tabs>
    <p className="settings-workspace-note"><Database size={15} aria-hidden="true" /> Las secciones y acciones disponibles dependen de los permisos de tu cuenta.</p>
  </div>;
}
