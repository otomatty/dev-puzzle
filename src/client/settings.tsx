import { createContext, type ReactNode, useContext, useState } from "react";
import { loadColorAssist, saveColorAssist } from "./storage";

interface Settings {
  /** 色に加えて形(▲●■)でも区別できるようにする */
  colorAssist: boolean;
  setColorAssist: (enabled: boolean) => void;
}

const SettingsContext = createContext<Settings>({
  colorAssist: false,
  setColorAssist: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [colorAssist, setState] = useState(loadColorAssist);
  const setColorAssist = (enabled: boolean) => {
    setState(enabled);
    saveColorAssist(enabled);
  };
  return (
    <SettingsContext.Provider value={{ colorAssist, setColorAssist }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): Settings {
  return useContext(SettingsContext);
}
