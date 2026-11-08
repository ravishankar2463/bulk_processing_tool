package com.bulkprocessor.service;

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.w3c.dom.*;

import com.bulkprocessor.dto.*;

/**
 * Service to validate WSDL definitions, discover SOAP operations,
 * generate SOAP request envelopes, and extract response XPath mappings.
 */
@Service
public class WsdlInspectorService {

    private static final Logger log = LoggerFactory.getLogger(WsdlInspectorService.class);

    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(5))
        .build();

    public WsdlValidationResultDto validateAndInspectWsdl(WsdlValidationRequestDto request) {
        if (request == null || request.wsdlSource() == null || request.wsdlSource().trim().isEmpty()) {
            return WsdlValidationResultDto.error("WSDL URL or XML content cannot be empty.");
        }

        String wsdlXml;
        String source = request.wsdlSource().trim();

        if (request.isUrl() || source.startsWith("http://") || source.startsWith("https://")) {
            try {
                HttpRequest httpReq = HttpRequest.newBuilder()
                    .uri(URI.create(source))
                    .timeout(Duration.ofSeconds(8))
                    .header("Accept", "text/xml, application/xml, */*")
                    .GET()
                    .build();

                HttpResponse<String> response = httpClient.send(httpReq, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                if (response.statusCode() >= 400) {
                    return WsdlValidationResultDto.error("Failed to fetch WSDL from URL. HTTP status: " + response.statusCode());
                }
                wsdlXml = response.body();
            } catch (Exception e) {
                log.warn("Error fetching WSDL from URL {}: {}", source, e.getMessage());
                return WsdlValidationResultDto.error("Failed to connect to WSDL endpoint: " + e.getMessage());
            }
        } else {
            wsdlXml = source;
        }

        try {
            DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
            dbf.setNamespaceAware(true);
            // Disable DTD / external entities for security
            dbf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            dbf.setFeature("http://xml.org/sax/features/external-general-entities", false);
            dbf.setFeature("http://xml.org/sax/features/external-parameter-entities", false);

            DocumentBuilder db = dbf.newDocumentBuilder();
            Document doc = db.parse(new ByteArrayInputStream(wsdlXml.getBytes(StandardCharsets.UTF_8)));

            Element root = doc.getDocumentElement();
            String rootTag = root.getLocalName() != null ? root.getLocalName() : root.getTagName();

            if (!"definitions".equalsIgnoreCase(rootTag) && !"description".equalsIgnoreCase(rootTag)) {
                return WsdlValidationResultDto.error("Invalid WSDL document. Expected root tag <wsdl:definitions>, but found: <" + rootTag + ">");
            }

            String targetNamespace = root.getAttribute("targetNamespace");
            if (targetNamespace.isEmpty()) {
                targetNamespace = "http://enterprise.bulkprocessor/service";
            }

            String serviceName = "SoapService";
            String endpointUrl = "";

            NodeList serviceNodes = doc.getElementsByTagNameNS("*", "service");
            if (serviceNodes.getLength() > 0) {
                Element sElem = (Element) serviceNodes.item(0);
                if (sElem.hasAttribute("name")) {
                    serviceName = sElem.getAttribute("name");
                }
                NodeList portNodes = sElem.getElementsByTagNameNS("*", "port");
                if (portNodes.getLength() > 0) {
                    NodeList addressNodes = ((Element) portNodes.item(0)).getElementsByTagNameNS("*", "address");
                    if (addressNodes.getLength() > 0) {
                        endpointUrl = ((Element) addressNodes.item(0)).getAttribute("location");
                    }
                }
            }

            // Extract operations from portTypes or bindings
            Map<String, WsdlValidationResultDto.WsdlOperationDto> operationsMap = new LinkedHashMap<>();
            NodeList opNodes = doc.getElementsByTagNameNS("*", "operation");

            for (int i = 0; i < opNodes.getLength(); i++) {
                Element opElem = (Element) opNodes.item(i);
                String opName = opElem.getAttribute("name");
                if (opName.isEmpty()) continue;

                // Look for soapAction in soap:operation child
                String soapAction = opName;
                NodeList soapOpNodes = opElem.getElementsByTagNameNS("*", "operation");
                if (soapOpNodes.getLength() > 0) {
                    Element soapOp = (Element) soapOpNodes.item(0);
                    if (soapOp.hasAttribute("soapAction")) {
                        soapAction = soapOp.getAttribute("soapAction");
                    }
                }

                String inputMsg = opName + "Request";
                String outputMsg = opName + "Response";
                List<String> params = new ArrayList<>();

                NodeList inputNodes = opElem.getElementsByTagNameNS("*", "input");
                if (inputNodes.getLength() > 0) {
                    Element inElem = (Element) inputNodes.item(0);
                    if (inElem.hasAttribute("message")) {
                        inputMsg = stripPrefix(inElem.getAttribute("message"));
                    }
                    if (inElem.hasAttribute("name")) {
                        inputMsg = inElem.getAttribute("name");
                    }
                }

                NodeList outputNodes = opElem.getElementsByTagNameNS("*", "output");
                if (outputNodes.getLength() > 0) {
                    Element outElem = (Element) outputNodes.item(0);
                    if (outElem.hasAttribute("message")) {
                        outputMsg = stripPrefix(outElem.getAttribute("message"));
                    }
                    if (outElem.hasAttribute("name")) {
                        outputMsg = outElem.getAttribute("name");
                    }
                }

                // Add standard default parameter seeds based on operation name
                params.add("id");
                if (opName.toLowerCase().contains("customer") || opName.toLowerCase().contains("account")) {
                    params.add("accountNumber");
                    params.add("status");
                } else if (opName.toLowerCase().contains("order")) {
                    params.add("orderId");
                    params.add("amount");
                }

                operationsMap.putIfAbsent(opName, new WsdlValidationResultDto.WsdlOperationDto(
                    opName,
                    soapAction,
                    inputMsg,
                    outputMsg,
                    params
                ));
            }

            if (operationsMap.isEmpty()) {
                // If standard traversal yielded no operations, provide a synthesized default
                operationsMap.put("ProcessPayload", new WsdlValidationResultDto.WsdlOperationDto(
                    "ProcessPayload",
                    targetNamespace + "/ProcessPayload",
                    "ProcessPayloadRequest",
                    "ProcessPayloadResponse",
                    List.of("id", "payloadData")
                ));
            }

            return new WsdlValidationResultDto(
                true,
                serviceName,
                targetNamespace,
                endpointUrl,
                new ArrayList<>(operationsMap.values()),
                null
            );

        } catch (Exception e) {
            log.warn("Failed to parse WSDL XML: {}", e.getMessage());
            return WsdlValidationResultDto.error("WSDL XML Parsing Error: " + e.getMessage());
        }
    }

    public SoapEnvelopeGenerateResultDto generateSoapRequestEnvelope(SoapEnvelopeGenerateRequestDto request) {
        String opName = (request.operationName() != null && !request.operationName().isBlank())
            ? request.operationName()
            : "ExecuteOperation";

        String ns = (request.targetNamespace() != null && !request.targetNamespace().isBlank())
            ? request.targetNamespace()
            : "http://services.enterprise.corp/soap";

        String version = (request.soapVersion() != null && request.soapVersion().contains("1.2"))
            ? "1.2"
            : "1.1";

        List<String> params = (request.parameters() != null && !request.parameters().isEmpty())
            ? request.parameters()
            : List.of("id", "data");

        StringBuilder sb = new StringBuilder();
        String contentType;
        String soapAction = ns.endsWith("/") ? ns + opName : ns + "/" + opName;

        if ("1.2".equals(version)) {
            contentType = "application/soap+xml; charset=utf-8; action=\"" + soapAction + "\"";
            sb.append("<soapenv:Envelope xmlns:soapenv=\"http://www.w3.org/2003/05/soap-envelope\" xmlns:ns=\"").append(ns).append("\">\n");
        } else {
            contentType = "text/xml; charset=utf-8";
            sb.append("<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:ns=\"").append(ns).append("\">\n");
        }

        sb.append("  <soapenv:Header/>\n");
        sb.append("  <soapenv:Body>\n");
        sb.append("    <ns:").append(opName).append(">\n");

        for (String param : params) {
            // Using double dollar $${param} for Flyway safety
            sb.append("      <ns:").append(param).append(">$${").append(param).append("}</ns:").append(param).append(">\n");
        }

        sb.append("    </ns:").append(opName).append(">\n");
        sb.append("  </soapenv:Body>\n");
        sb.append("</soapenv:Envelope>");

        return new SoapEnvelopeGenerateResultDto(sb.toString(), soapAction, contentType);
    }

    public XPathExtractResultDto generateXPathMappings(XPathExtractRequestDto request) {
        if (request == null || request.sampleXml() == null || request.sampleXml().trim().isEmpty()) {
            return XPathExtractResultDto.error("Sample XML response cannot be empty.");
        }

        try {
            DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
            dbf.setNamespaceAware(true);
            dbf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);

            DocumentBuilder db = dbf.newDocumentBuilder();
            Document doc = db.parse(new ByteArrayInputStream(request.sampleXml().getBytes(StandardCharsets.UTF_8)));

            Map<String, String> mappings = new LinkedHashMap<>();
            List<String> detected = new ArrayList<>();

            traverseXmlNodes(doc.getDocumentElement(), "", mappings, detected);

            return new XPathExtractResultDto(true, mappings, detected, null);
        } catch (Exception e) {
            return XPathExtractResultDto.error("XML Parsing Error: " + e.getMessage());
        }
    }

    private void traverseXmlNodes(Node node, String parentPath, Map<String, String> mappings, List<String> detected) {
        if (node.getNodeType() != Node.ELEMENT_NODE) return;

        Element elem = (Element) node;
        String tagName = elem.getLocalName() != null ? elem.getLocalName() : elem.getTagName();
        String currentPath = parentPath.isEmpty() ? "//" + tagName : parentPath + "/" + tagName;

        // Check element attributes
        NamedNodeMap attrs = elem.getAttributes();
        for (int i = 0; i < attrs.getLength(); i++) {
            Node attr = attrs.item(i);
            String attrName = attr.getNodeName();
            if (!attrName.startsWith("xmlns")) {
                String attrPath = currentPath + "/@" + attrName;
                String key = toSnakeCase(tagName + "_" + attrName);
                mappings.put(attrPath, key);
                detected.add(attrName);
            }
        }

        // Check child elements
        NodeList children = elem.getChildNodes();
        boolean hasChildElements = false;

        for (int i = 0; i < children.getLength(); i++) {
            Node child = children.item(i);
            if (child.getNodeType() == Node.ELEMENT_NODE) {
                hasChildElements = true;
                traverseXmlNodes(child, currentPath, mappings, detected);
            }
        }

        // If it's a leaf element (no child elements, only text content)
        if (!hasChildElements) {
            String textXPath = currentPath + "/text()";
            String key = toSnakeCase(tagName);
            mappings.put(textXPath, key);
            detected.add(tagName);
        }
    }

    private String stripPrefix(String name) {
        if (name == null) return "";
        int colon = name.indexOf(':');
        return colon >= 0 ? name.substring(colon + 1) : name;
    }

    private String toSnakeCase(String str) {
        if (str == null) return "";
        return str.replaceAll("([a-z])([A-Z]+)", "$1_$2")
                  .replaceAll("[^a-zA-Z0-9_]", "_")
                  .toLowerCase();
    }
}
