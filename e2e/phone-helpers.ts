import type { Page } from "@playwright/test";

export async function freshPhoneHome(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase("scrabble-babble");
      req.onsuccess = () => resolve(); req.onerror = () => resolve(); req.onblocked = () => resolve();
    });
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open("scrabble-babble", 1);
      open.onupgradeneeded = () => {
        const db = open.result;
        if (!db.objectStoreNames.contains("in_progress")) db.createObjectStore("in_progress");
        if (!db.objectStoreNames.contains("history")) db.createObjectStore("history", { keyPath: "id" });
        if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings", { keyPath: "key" });
      };
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction("settings", "readwrite");
        tx.objectStore("settings").put({ key: "current_user", value: "Tester" });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      open.onerror = () => reject(open.error);
    });
  });
  await page.reload();
}
