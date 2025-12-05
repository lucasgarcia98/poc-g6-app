declare module '*.wasm' {
  const content: string;
  export default content;
}

declare module './wa-sqlite/sqlite-api' {
  interface SQLiteAPI {
    // Add the SQLite API methods you're using here
    // For example:
    prepare: (db: any, sql: string) => any;
    step: (stmt: any) => any;
    // Add other methods as needed
  }

  const api: SQLiteAPI;
  export default api;
}