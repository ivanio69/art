const DB_NAME = 'art-memory-images-v1';
export const STORAGE_KEY = 'art-memory-v1';
function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('images');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function saveImages(files) {
  const db = await database();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readwrite');
      files.forEach(({ id, file }) => tx.objectStore('images').put(file, id));
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
export async function loadImages() {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readonly'); const store = tx.objectStore('images');
      const request = store.openCursor(); const results = [];
      request.onsuccess = () => { const cursor = request.result; if (cursor) { results.push({ id: Number(cursor.key), blob: cursor.value }); cursor.continue(); } };
      tx.oncomplete = () => resolve(results); tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}
export function downloadJson(data, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
