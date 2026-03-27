import { DELIMITER } from "./const";
import { parse } from "smol-toml";
import { Content } from "./types";
import * as openpgp from "openpgp";

export async function createContent(content: string): Promise<Content> {
  console.log("=== createContent DEBUG ===");
  console.log("Input length:", content?.length);
  console.log("First 300 chars:", content?.substring(0, 300));
  console.log("Last 100 chars:", content?.substring(content.length - 100));
  
  if (!content) {
    console.log("No content provided");
    return {
      body: "No content available",
      original: "",
      timestamp: new Date()
    };
  }
  
  // Check if this looks like a PGP clearsigned message
  const isPGPSigned = content.includes("-----BEGIN PGP SIGNED MESSAGE-----") && 
                     content.includes("-----END PGP SIGNATURE-----");
  
  if (!isPGPSigned) {
    console.log("Content does not look like a PGP clearsigned message - returning as-is");
    return {
      body: content,
      original: content,
      timestamp: new Date()
    };
  }

  console.log("Processing as PGP clearsigned message");

  // Extract content between PGP headers, even if signature parsing fails
  const lines = content.split("\n");
  console.log("Total lines:", lines.length);
  
  let beginIndex = -1;
  let signatureIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("-----BEGIN PGP SIGNED MESSAGE-----")) {
      beginIndex = i;
    } else if (lines[i].startsWith("-----BEGIN PGP SIGNATURE-----")) {
      signatureIndex = i;
      break;
    }
  }
  
  console.log("Begin index:", beginIndex, "Signature index:", signatureIndex);
  
  if (beginIndex === -1 || signatureIndex === -1) {
    console.log("Could not find PGP boundaries, returning raw content");
    return {
      body: content,
      original: content,
      timestamp: new Date()
    };
  }
  
  // Extract content between BEGIN and SIGNATURE
  // Skip the BEGIN line, Hash line, and any empty line after
  let contentStart = beginIndex + 1;
  
  // Skip Hash: line if present
  if (contentStart < lines.length && lines[contentStart].startsWith("Hash:")) {
    contentStart++;
  }
  
  // Skip empty line if present
  if (contentStart < lines.length && lines[contentStart].trim() === "") {
    contentStart++;
  }
  
  const contentLines = lines.slice(contentStart, signatureIndex);
  console.log("Content lines extracted:", contentLines.length);
  console.log("First few content lines:", contentLines.slice(0, 3));
  
  // Join the content lines
  let extractedBody = contentLines.join("\n").trim();
  
  // Handle delimiter if present
  const delimiterIndex = contentLines.findIndex(line => line.startsWith(DELIMITER));
  let info = undefined;
  
  if (delimiterIndex >= 0) {
    console.log("Found delimiter at line:", delimiterIndex);
    const infoLines = contentLines.slice(0, delimiterIndex);
    const bodyLines = contentLines.slice(delimiterIndex + 1);
    
    if (infoLines.length > 0) {
      try {
        info = parse(infoLines.join("\n"));
      } catch (error) {
        console.warn("Failed to parse info section:", error);
      }
    }
    
    extractedBody = bodyLines.join("\n").trim();
  }
  
  console.log("Final extracted body length:", extractedBody.length);
  console.log("Body preview:", extractedBody.substring(0, 150));
  
  // Try to extract timestamp from signature if possible
  let timestamp = new Date();
  try {
    const signatureLines = lines.slice(signatureIndex);
    const sig = await openpgp.readSignature({
      armoredSignature: signatureLines.join("\n"),
    });
    
    const sigTimestamp = sig.packets
      .map((packet) => packet.created)
      .filter((created) => created)[0];
    
    if (sigTimestamp) {
      timestamp = sigTimestamp;
      console.log("Extracted signature timestamp:", timestamp);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log("Could not extract signature timestamp, using current time:", errorMessage);
  }
  
  const result = {
    body: extractedBody,
    original: content,
    timestamp,
    ...(info && { info })
  };
  
  console.log("=== Final result ===");
  console.log("Body length:", result.body.length);
  console.log("Has info:", !!result.info);
  
  return result;
}
