import * as pako from "pako";

self.onmessage = (event: MessageEvent<{ html: string; activityId: string; workspaceId: string }>) => {
  const { html, activityId, workspaceId } = event.data;
  try {
    const utf8 = new TextEncoder().encode(html);
    const compressed = pako.gzip(utf8);
    const base64 = btoa(String.fromCharCode(...compressed));
    self.postMessage({ base64, activityId, workspaceId });
  } catch (e) {
    // silencia erro de compressão — não trava o editor
  }
};