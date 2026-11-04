// Browser-local storage. The non-exportable key stays in IndexedDB with the
// encrypted records. This protects stored values, not an unlocked browser or XSS.
type Sealed = { iv: Uint8Array<ArrayBuffer>; data: ArrayBuffer };

export function createWebVault(
  factory: IDBFactory,
  webCrypto: Crypto,
  name = "grace-and-gather-vault-v1",
) {
  let opening: Promise<{ db: IDBDatabase; key: CryptoKey }> | undefined;

  function transaction<T>(
    db: IDBDatabase,
    stores: string[],
    mode: IDBTransactionMode,
    run: (tx: IDBTransaction, result: (value: T) => void) => void,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      let value: T;
      tx.oncomplete = () => resolve(value);
      tx.onabort = () =>
        reject(tx.error ?? Error("Browser storage could not be saved."));
      tx.onerror = () =>
        reject(tx.error ?? Error("Browser storage is unavailable."));
      try {
        run(tx, (next) => {
          value = next;
        });
      } catch (error) {
        tx.abort();
        reject(error);
      }
    });
  }

  async function open() {
    if (!factory || !webCrypto?.subtle)
      throw Error("Secure browser storage is unavailable.");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(name, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("keys");
        request.result.createObjectStore("values");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(Error("Close other app tabs and try again."));
    });
    db.onversionchange = () => db.close();
    try {
      const candidate = await webCrypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
      );
      // A single read/write transaction chooses the same key across tabs. Never
      // replace a missing key while encrypted records still exist.
      const key = await transaction<CryptoKey>(
        db,
        ["keys", "values"],
        "readwrite",
        (tx, result) => {
          const keys = tx.objectStore("keys");
          const request = keys.get("journal");
          request.onsuccess = () => {
            if (request.result) {
              result(request.result);
              return;
            }
            const count = tx.objectStore("values").count();
            count.onsuccess = () => {
              if (count.result) {
                tx.abort();
                return;
              }
              keys.put(candidate, "journal");
              result(candidate);
            };
          };
        },
      );
      if (
        key.type !== "secret" ||
        key.algorithm.name !== "AES-GCM" ||
        key.extractable
      )
        throw Error("The browser journal key could not be read.");
      return { db, key };
    } catch (error) {
      db.close();
      throw error;
    }
  }
  function ready() {
    return (opening ??= open().catch((error) => {
      opening = undefined;
      throw error;
    }));
  }
  const context = (key: string) => new TextEncoder().encode(key);
  return {
    async initialize() {
      await ready();
    },
    async getItem(name: string): Promise<string | null> {
      const { db, key } = await ready();
      const sealed = await transaction<Sealed | undefined>(
        db,
        ["values"],
        "readonly",
        (tx, result) => {
          const request = tx.objectStore("values").get(name);
          request.onsuccess = () => result(request.result);
        },
      );
      if (!sealed) return null;
      const data = await webCrypto.subtle.decrypt(
        { name: "AES-GCM", iv: sealed.iv, additionalData: context(name) },
        key,
        sealed.data,
      );
      return new TextDecoder().decode(data);
    },
    async setItem(name: string, value: string) {
      const { db, key } = await ready();
      const iv = webCrypto.getRandomValues(new Uint8Array(12));
      const data = await webCrypto.subtle.encrypt(
        { name: "AES-GCM", iv, additionalData: context(name) },
        key,
        new TextEncoder().encode(value),
      );
      await transaction<void>(db, ["values"], "readwrite", (tx) => {
        tx.objectStore("values").put({ iv, data }, name);
      });
    },
    async removeItem(name: string) {
      const { db } = await ready();
      await transaction<void>(db, ["values"], "readwrite", (tx) => {
        tx.objectStore("values").delete(name);
      });
    },
    async clearVault() {
      const { db } = await ready();
      await transaction<void>(db, ["values"], "readwrite", (tx) => {
        tx.objectStore("values").clear();
      });
    },
    async close() {
      (await ready()).db.close();
      opening = undefined;
    },
  };
}
