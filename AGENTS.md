# Architecture rules
- Deliver the standalone Python OCR server as a versioned source archive; keep processing and API logic there, not in the React application, because OCR requires native Python dependencies.
- Use local label-anchor extraction and field validation before any optional model fallback; route only bounded unresolved-field crops, never the full page.