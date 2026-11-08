import React from 'react';
import { AdminComponentWizard, ComponentInstanceData } from './AdminComponentWizard';
import { AdminComponentEditor } from './AdminComponentEditor';
import { AdminPipelineWizard, PipelineDefinitionData } from './AdminPipelineWizard';
import { UserUpload } from '../user/UserUpload';
import { RouteConfigData } from './AdminRouteStudio';

export interface AdminModalsContainerProps {
  activeModal: 'NONE' | 'WIZARD' | 'EDITOR' | 'UPLOAD' | 'PIPELINE_WIZARD';
  editingComponent?: ComponentInstanceData;
  editingRoute: RouteConfigData | null;
  routes: RouteConfigData[];
  onSaveComponent: (data: ComponentInstanceData) => void;
  onSavePipeline: (data: PipelineDefinitionData) => void;
  onUploadSubmit: (file: File, routeId: string) => void;
  onCloseModal: () => void;
  onClearEditingComponent: () => void;
  onClearEditingRoute: () => void;
}

export const AdminModalsContainer: React.FC<AdminModalsContainerProps> = ({
  activeModal,
  editingComponent,
  editingRoute,
  routes,
  onSaveComponent,
  onSavePipeline,
  onUploadSubmit,
  onCloseModal,
  onClearEditingComponent,
  onClearEditingRoute
}) => {
  if (activeModal === 'NONE') return null;

  return (
    <div
      onClick={onCloseModal}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '24px 16px',
        zIndex: 1000,
        overflowY: 'auto'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          width: '100%', 
          maxWidth: activeModal === 'UPLOAD' ? '680px' : '980px',
          margin: 'auto 0'
        }}
      >
        {activeModal === 'WIZARD' && (
          <AdminComponentWizard
            onSave={onSaveComponent}
            onCancel={onCloseModal}
          />
        )}
        {activeModal === 'EDITOR' && (
          <AdminComponentEditor
            initialData={editingComponent}
            onSave={onSaveComponent}
            onCancel={() => {
              onCloseModal();
              onClearEditingComponent();
            }}
          />
        )}
        {activeModal === 'UPLOAD' && (
          <UserUpload
            availableRoutes={routes.map(r => ({ routeId: r.routeId, name: r.name }))}
            onUpload={onUploadSubmit}
            onCancel={onCloseModal}
          />
        )}
        {activeModal === 'PIPELINE_WIZARD' && (
          <AdminPipelineWizard
            initialData={editingRoute}
            onSave={onSavePipeline}
            onCancel={() => {
              onCloseModal();
              onClearEditingRoute();
            }}
          />
        )}
      </div>
    </div>
  );
};
