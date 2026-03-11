import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SWAGGER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>OCR Scan API – Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"/>
  <style>body{margin:0}</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      spec: {
        openapi: "3.0.3",
        info: {
          title: "OCR Scan API",
          version: "1.0.0",
          description: "API pentru extragerea câmpurilor din documente românești (Talon auto și Carte de identitate) folosind OCR cu AI."
        },
        servers: [{ url: "BASE_URL" }],
        components: {
          securitySchemes: {
            ApiKeyHeader: {
              type: "apiKey",
              in: "header",
              name: "x-api-key",
              description: "API key pentru autentificare"
            },
            BearerAuth: {
              type: "http",
              scheme: "bearer",
              description: "API key trimis ca Bearer token"
            }
          },
          schemas: {
            Field: {
              type: "object",
              properties: {
                code: { type: "string", example: "A" },
                label: { type: "string", example: "Numărul de înmatriculare" },
                value: { type: "string", example: "B 123 ABC" }
              }
            },
            SuccessResponse: {
              type: "object",
              properties: {
                docType: { type: "string", enum: ["talon", "id-card"] },
                fields: { type: "array", items: { "$ref": "#/components/schemas/Field" } },
                raw: { type: "object", additionalProperties: { type: "string" } }
              }
            },
            ErrorResponse: {
              type: "object",
              properties: {
                error: { type: "string", example: "Acces neautorizat. API key invalid sau lipsă." }
              }
            }
          }
        },
        security: [{ ApiKeyHeader: [] }, { BearerAuth: [] }],
        paths: {
          "/ocr-scan": {
            post: {
              summary: "Scanează un document",
              description: "Acceptă o imagine sau PDF cu un document românesc și returnează câmpurile extrase prin OCR.\\n\\n**Tipuri de documente suportate:**\\n- \`talon\` – Certificat de înmatriculare (24 câmpuri: A–X)\\n- \`id-card\` – Carte de identitate (20 câmpuri: CNP, nume, adresă etc.)",
              requestBody: {
                required: true,
                content: {
                  "multipart/form-data": {
                    schema: {
                      type: "object",
                      required: ["file"],
                      properties: {
                        file: { type: "string", format: "binary", description: "Fișier imagine (JPEG, PNG) sau PDF" },
                        docType: { type: "string", enum: ["talon", "id-card"], default: "talon", description: "Tipul documentului" }
                      }
                    }
                  },
                  "application/json": {
                    schema: {
                      type: "object",
                      required: ["file", "mimeType"],
                      properties: {
                        file: { type: "string", format: "byte", description: "Conținutul fișierului codificat Base64" },
                        mimeType: { type: "string", example: "image/jpeg", description: "MIME type al fișierului" },
                        docType: { type: "string", enum: ["talon", "id-card"], default: "talon" }
                      }
                    }
                  }
                }
              },
              responses: {
                "200": {
                  description: "Document procesat cu succes",
                  content: { "application/json": { schema: { "$ref": "#/components/schemas/SuccessResponse" } } }
                },
                "401": {
                  description: "API key invalid sau lipsă",
                  content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } }
                },
                "400": {
                  description: "Request invalid",
                  content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } }
                },
                "500": {
                  description: "Eroare internă",
                  content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } }
                }
              }
            }
          }
        }
      },
      dom_id: "#swagger-ui",
      deepLinking: true,
      layout: "BaseLayout"
    });
  </script>
</body>
</html>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = Deno.env.get("SUPABASE_URL") || "";
  const baseUrl = url ? url + "/functions/v1" : "";
  const html = SWAGGER_HTML.replace("BASE_URL", baseUrl);

  return new Response(html, {
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
});
