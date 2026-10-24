import axios from 'axios';
import { apiClient } from '../api-client';

/**
 * Downloads a CSV export. It goes through the API client so the login token
 * is sent, which a plain link could not do.
 */
export async function downloadCsv(
  path: string,
  params: Record<string, string | undefined>,
  filenameBase: string,
) {
  try {
    const res = await apiClient.get(path, { params, responseType: 'blob' });

    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filenameBase}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    // A failed download arrives as a Blob; read the server's message out of it
    // so the usual error helper can show it.
    if (axios.isAxiosError(err) && err.response && err.response.data instanceof Blob) {
      try {
        err.response.data = JSON.parse(await err.response.data.text());
      } catch {
        // not JSON; keep the original error
      }
    }
    throw err;
  }
}