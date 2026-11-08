-- V2: Dynamic Connectors Catalog, Configured Instances, and Route Topology DAG Graph

-- 1. Connector Definition Catalog (generic built-in + dynamic custom connectors)
CREATE TABLE IF NOT EXISTS connector_definition (
    definition_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    category VARCHAR(32) NOT NULL, -- SOURCE, PROCESSOR, SINK, TRANSFORM
    stream_role VARCHAR(16) NOT NULL DEFAULT 'MIDDLE', -- START, MIDDLE, END
    protocol VARCHAR(32) NOT NULL, -- CSV, REST_JSON, SOAP_XML, DATABASE, KAFKA, CUSTOM
    description TEXT,
    icon VARCHAR(64) DEFAULT 'plug',
    is_composite BOOLEAN NOT NULL DEFAULT FALSE,
    property_manifest TEXT NOT NULL, -- JSON Schema describing configurable properties and form inputs
    is_built_in BOOLEAN NOT NULL DEFAULT FALSE,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conn_def_cat ON connector_definition(category);
CREATE INDEX IF NOT EXISTS idx_conn_def_proto ON connector_definition(protocol);

-- 2. Configured Connector Instances
CREATE TABLE IF NOT EXISTS connector_instance (
    instance_id VARCHAR(64) PRIMARY KEY,
    definition_id VARCHAR(64) NOT NULL REFERENCES connector_definition(definition_id) ON DELETE RESTRICT,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    configuration TEXT NOT NULL, -- JSON of configured values (e.g. source details, fields schema, headers, credentials)
    version INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(64) DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conn_inst_def ON connector_instance(definition_id);

-- 3. Route Topology DAG Graph (Node-Edge visual dataflow layout and port bindings)
CREATE TABLE IF NOT EXISTS route_topology (
    topology_id VARCHAR(64) PRIMARY KEY,
    route_id VARCHAR(64) NOT NULL UNIQUE REFERENCES route_config(route_id) ON DELETE CASCADE,
    nodes_json TEXT NOT NULL, -- JSON array of TopologyNode
    edges_json TEXT NOT NULL, -- JSON array of TopologyEdge
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_route_top_route ON route_topology(route_id);

-- Seed Built-In Generic Connector Definitions
INSERT INTO connector_definition (
    definition_id, name, category, stream_role, protocol, description, icon, is_composite, property_manifest, is_built_in, version
) VALUES 
(
    'conn-def-csv',
    'CSV Ingestion Connector',
    'SOURCE',
    'START',
    'CSV',
    'High-throughput streaming CSV source supporting Manual Upload, AWS S3, and SFTP with dynamic field schema and type coercion.',
    'file-spreadsheet',
    FALSE,
    '{"properties":[{"key":"sourceType","label":"CSV Source Type","type":"select","options":["MANUAL_UPLOAD","S3_BUCKET","SFTP_SERVER","LOCAL_DIRECTORY"],"defaultValue":"MANUAL_UPLOAD","required":true},{"key":"s3Uri","label":"S3 Location URI","type":"string","placeholder":"s3://my-enterprise-bucket/inbox/*.csv","required":false},{"key":"delimiter","label":"Field Delimiter","type":"select","options":[",",";","\\t","|"],"defaultValue":",","required":true},{"key":"hasHeader","label":"Has Header Row","type":"boolean","defaultValue":true,"required":true},{"key":"quoteChar","label":"Quote Character","type":"string","defaultValue":"\\"","required":false},{"key":"charset","label":"Encoding Charset","type":"select","options":["UTF-8","ISO-8859-1","US-ASCII"],"defaultValue":"UTF-8","required":true},{"key":"fields","label":"CSV Schema Fields","type":"fields_schema","required":true}]}',
    TRUE,
    1
),
(
    'conn-def-rest-json',
    'REST JSON Connector (Req & Res Pair)',
    'PROCESSOR',
    'MIDDLE',
    'REST_JSON',
    'Composite HTTP REST client instantiating paired Request and Response nodes for record enrichment, payload generation, and JSONPath extraction.',
    'globe',
    TRUE,
    '{"properties":[{"key":"method","label":"HTTP Method","type":"select","options":["GET","POST","PUT","PATCH","DELETE"],"defaultValue":"POST","required":true},{"key":"endpointUrl","label":"Endpoint URL","type":"string","placeholder":"https://api.internal.corp/v1/enrich/$${id}","required":true},{"key":"authType","label":"Authentication","type":"select","options":["NONE","BEARER_TOKEN","API_KEY_HEADER","BASIC_AUTH"],"defaultValue":"NONE","required":true},{"key":"headers","label":"HTTP Headers","type":"key_value","required":false},{"key":"bodyTemplate","label":"Request Body Template","type":"string","placeholder":"{\\"customerId\\": \\"$${id}\\", \\"email\\": \\"$${email}\\"}","required":false},{"key":"timeoutMs","label":"Timeout (ms)","type":"number","defaultValue":5000,"required":true},{"key":"responseExtractMap","label":"JSONPath Field Extractions","type":"key_value","required":false}]}',
    TRUE,
    1
),
(
    'conn-def-soap-xml',
    'SOAP XML Connector (Req & Res Pair)',
    'PROCESSOR',
    'MIDDLE',
    'SOAP_XML',
    'Composite SOAP Web Service client instantiating XML Request Envelope generator and XML Response XPath extractor.',
    'code-2',
    TRUE,
    '{"properties":[{"key":"wsdlUrl","label":"WSDL or Service URL","type":"string","placeholder":"https://legacy.corp/ws/CustomerService?wsdl","required":true},{"key":"soapAction","label":"SOAPAction Header","type":"string","placeholder":"urn:ProcessCustomerRecord","required":false},{"key":"soapVersion","label":"SOAP Protocol Version","type":"select","options":["1.1","1.2"],"defaultValue":"1.1","required":true},{"key":"envelopeTemplate","label":"SOAP Request Envelope Template","type":"string","placeholder":"<soapenv:Envelope xmlns:soapenv=\\"http://schemas.xmlsoap.org/soap/envelope/\\"><soapenv:Body><CustomerRequest id=\\"$${id}\\"/></soapenv:Body></soapenv:Envelope>","required":true},{"key":"xpathExtractMap","label":"XPath Field Extractions","type":"key_value","required":false}]}',
    TRUE,
    1
),
(
    'conn-def-db-sink',
    'Database JDBC Sink Connector',
    'SINK',
    'END',
    'DATABASE',
    'Relational database writer with batch inserts, upsert support, and connection pooling.',
    'database',
    FALSE,
    '{"properties":[{"key":"jdbcUrl","label":"JDBC Connection URL","type":"string","placeholder":"jdbc:postgresql://postgres:5432/bulk_analytics","required":true},{"key":"targetTable","label":"Target Table","type":"string","placeholder":"processed_records","required":true},{"key":"batchSize","label":"Batch Insert Size","type":"number","defaultValue":1000,"required":true},{"key":"upsertKey","label":"Conflict / Upsert Key","type":"string","required":false}]}',
    TRUE,
    1
)
ON CONFLICT (definition_id) DO NOTHING;
