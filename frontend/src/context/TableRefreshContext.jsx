import { createContext, useCallback, useContext, useState } from "react";

const TableRefreshContext = createContext(null);

export function TableRefreshProvider({ children }) {
  const [tableCount, setTableCount]   = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);

  const triggerTableRefresh  = useCallback(() => setTableCount((c)  => c + 1), []);
  const triggerOrdersRefresh = useCallback(() => setOrdersCount((c) => c + 1), []);

  return (
    <TableRefreshContext.Provider value={{ tableRefreshCount: tableCount, triggerTableRefresh, ordersRefreshCount: ordersCount, triggerOrdersRefresh }}>
      {children}
    </TableRefreshContext.Provider>
  );
}

export const useTableRefresh = () => useContext(TableRefreshContext);
