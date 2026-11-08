import { describe, it, expect } from 'vitest';
import { 
  fetchConnectorDefinitions, 
  createCustomConnectorDefinition, 
  deleteCustomConnectorDefinition, 
  fetchConnectorInstances, 
  saveConnectorInstance, 
  fetchRouteTopology, 
  saveRouteTopology, 
  validateRouteTopology,
  dryRunConnector 
} from '../services/apiClient';

describe('Connector and Route Topology API Client', () => {
  it('fetches built-in connector definitions', async () => {
    const defs = await fetchConnectorDefinitions();
    expect(defs.length).toBeGreaterThanOrEqual(4);
    const csvDef = defs.find(d => d.protocol === 'CSV');
    expect(csvDef).toBeDefined();
    expect(csvDef?.name).toContain('CSV');
  });

  it('creates and deletes custom connector definition in mock store', async () => {
    const created = await createCustomConnectorDefinition({
      name: 'Test Kafka Producer',
      category: 'SINK',
      protocol: 'KAFKA',
      description: 'Publishes records to Kafka broker',
      propertyManifest: '{"properties":[]}'
    });

    expect(created.definitionId).toBeDefined();
    expect(created.name).toBe('Test Kafka Producer');

    const defsAfterCreate = await fetchConnectorDefinitions();
    expect(defsAfterCreate.some(d => d.definitionId === created.definitionId)).toBe(true);

    const deleted = await deleteCustomConnectorDefinition(created.definitionId);
    expect(deleted).toBe(true);
  });

  it('saves and fetches configured connector instances', async () => {
    const saved = await saveConnectorInstance({
      definitionId: 'conn-def-csv',
      name: 'Orders Raw Ingestion',
      configuration: JSON.stringify({ sourceType: 'S3_BUCKET', delimiter: ',' })
    });

    expect(saved.instanceId).toBeDefined();
    expect(saved.name).toBe('Orders Raw Ingestion');

    const instances = await fetchConnectorInstances();
    expect(instances.some(i => i.instanceId === saved.instanceId)).toBe(true);
  });

  it('fetches and updates route topology graph', async () => {
    const topology = await fetchRouteTopology('customer-master-onboarding');
    expect(topology.routeId).toBe('customer-master-onboarding');
    expect(topology.nodes.length).toBeGreaterThan(0);
    expect(topology.edges.length).toBeGreaterThan(0);

    const updatedTopology = {
      ...topology,
      version: topology.version + 1
    };

    const saved = await saveRouteTopology('customer-master-onboarding', updatedTopology);
    expect(saved.version).toBe(topology.version + 1);
  });

  it('validates route topology graph structure', async () => {
    const topology = await fetchRouteTopology('customer-master-onboarding');
    const validation = await validateRouteTopology('customer-master-onboarding', topology);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('executes dry-run connector sandbox test', async () => {
    const res = await dryRunConnector({
      protocol: 'CSV',
      configuration: '{"delimiter": ","}',
      sampleInput: 'id,name,val\n1,Acme,50\n2,Beta,90'
    });

    expect(res.success).toBe(true);
    expect(res.recordsExtracted).toBe(2);
    expect(res.previewRecords[0]).toHaveProperty('name', 'Acme');
    expect(res.durationMicros).toBeGreaterThan(0);
  });
});
