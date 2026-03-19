import api from './client';

export async function fetchYjsState(activityId: string, timeoutMs = 3000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await api.get<{ yjsState: string }>(
      `/folders/activities/${activityId}/yjs-state`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    return response.data.yjsState;
  } catch (err: any) {
    return null;
  }
}
