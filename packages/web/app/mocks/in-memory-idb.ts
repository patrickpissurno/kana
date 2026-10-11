type StoredRecord = Record<string, unknown>;

type StoreState = {
  records: StoredRecord[];
  autoIncrementId: number;
  keyPath?: string;
  autoIncrement?: boolean;
  indices: Map<string, string>;
};

type DatabaseState = {
  version: number;
  stores: Map<string, StoreState>;
};

type FakeRequest<T> = {
  result: T;
  error: DOMException | null;
  onsuccess: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  triggerSuccess: (val: T) => void;
  triggerError: (err: DOMException) => void;
};

type FakeOpenRequest = FakeRequest<unknown> & {
  onupgradeneeded: ((event: IDBVersionChangeEvent) => void) | null;
};

function createFakeRequest<T>(): FakeRequest<T> {
  const req: FakeRequest<T> = {
    result: undefined as unknown as T,
    error: null,
    onsuccess: null,
    onerror: null,
    triggerSuccess(val: T) {
      req.result = val;
      queueMicrotask(() => {
        if (req.onsuccess) {
          req.onsuccess(new Event('success'));
        }
      });
    },
    triggerError(err: DOMException) {
      req.error = err;
      queueMicrotask(() => {
        if (req.onerror) {
          req.onerror(new Event('error'));
        }
      });
    },
  };
  return req;
}

function createFakeIndex(storeState: StoreState, keyPath: string) {
  return {
    getAll(query?: unknown) {
      const req = createFakeRequest<StoredRecord[]>();
      const matches =
        query === undefined
          ? [...storeState.records]
          : storeState.records.filter((r) => r[keyPath] === query);
      req.triggerSuccess(matches);
      return req;
    },
  };
}

function createFakeObjectStore(storeState: StoreState) {
  return {
    createIndex(name: string, keyPath: string) {
      storeState.indices.set(name, keyPath);
      return createFakeIndex(storeState, keyPath);
    },
    index(name: string) {
      const keyPath = storeState.indices.get(name) ?? name;
      return createFakeIndex(storeState, keyPath);
    },
    add(value: StoredRecord) {
      const req = createFakeRequest<number | string>();
      const record = { ...value };
      let id = record['id'];

      if (storeState.autoIncrement && id === undefined) {
        storeState.autoIncrementId += 1;
        id = storeState.autoIncrementId;
        record['id'] = id;
      }

      storeState.records.push(record);
      req.triggerSuccess(id as number | string);
      return req;
    },
    get(id: unknown) {
      const req = createFakeRequest<StoredRecord | undefined>();
      const record = storeState.records.find((r) => r['id'] === id);
      req.triggerSuccess(record ? { ...record } : undefined);
      return req;
    },
    put(value: StoredRecord) {
      const req = createFakeRequest<number | string>();
      const record = { ...value };
      const id = record['id'];

      const index = storeState.records.findIndex((r) => r['id'] === id);
      if (index >= 0) {
        storeState.records[index] = record;
      } else {
        storeState.records.push(record);
      }

      req.triggerSuccess(id as number | string);
      return req;
    },
    getAll() {
      const req = createFakeRequest<StoredRecord[]>();
      req.triggerSuccess([...storeState.records]);
      return req;
    },
  };
}

function createFakeTransaction(dbState: DatabaseState) {
  return {
    objectStore(name: string) {
      let store = dbState.stores.get(name);
      if (!store) {
        store = {
          records: [],
          autoIncrementId: 0,
          indices: new Map(),
        };
        dbState.stores.set(name, store);
      }
      return createFakeObjectStore(store);
    },
  };
}

function createFakeDatabase(dbName: string, version: number, dbState: DatabaseState) {
  return {
    name: dbName,
    version,
    objectStoreNames: {
      contains(name: string) {
        return dbState.stores.has(name);
      },
    },
    createObjectStore(storeName: string, options?: { keyPath?: string; autoIncrement?: boolean }) {
      const storeState: StoreState = {
        records: [],
        autoIncrementId: 0,
        keyPath: options?.keyPath,
        autoIncrement: options?.autoIncrement,
        indices: new Map(),
      };
      dbState.stores.set(storeName, storeState);
      return createFakeObjectStore(storeState);
    },
    transaction(_storeNames: string | string[], _mode?: IDBTransactionMode) {
      return createFakeTransaction(dbState);
    },
    close() {
      // no-op
    },
  };
}

export function createInMemoryIndexedDB(): IDBFactory {
  const dbs = new Map<string, DatabaseState>();

  const factory: IDBFactory = {
    open(name: string, version?: number) {
      const targetVersion = version ?? 1;
      let dbState = dbs.get(name);
      const isNew = !dbState;

      if (!dbState) {
        dbState = {
          version: targetVersion,
          stores: new Map(),
        };
        dbs.set(name, dbState);
      }

      const req = createFakeRequest<unknown>() as FakeOpenRequest;
      req.onupgradeneeded = null;
      const fakeDb = createFakeDatabase(name, targetVersion, dbState);

      queueMicrotask(() => {
        req.result = fakeDb;
        if (isNew && req.onupgradeneeded) {
          const event = new Event('upgradeneeded') as IDBVersionChangeEvent;
          req.onupgradeneeded(event);
        }
        req.triggerSuccess(fakeDb);
      });

      return req as unknown as IDBOpenDBRequest;
    },
    deleteDatabase(name: string) {
      dbs.delete(name);
      const req = createFakeRequest<undefined>();
      req.triggerSuccess(undefined);
      return req as unknown as IDBOpenDBRequest;
    },
    async databases() {
      await Promise.resolve();
      return Array.from(dbs.entries()).map(([name, state]) => ({
        name,
        version: state.version,
      }));
    },
    cmp(_first: unknown, _second: unknown) {
      return 0;
    },
  };

  return factory;
}
