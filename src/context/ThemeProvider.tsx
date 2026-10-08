"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

type ThemeContextValue = {
    theme: Theme;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = "asistime:theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>("dark");

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        const nextTheme: Theme = stored === "light" ? "light" : "dark";
        setTheme(nextTheme);
        document.documentElement.classList.toggle("theme-light", nextTheme === "light");
    }, []);

    const toggleTheme = () => {
        setTheme((current) => {
            const nextTheme: Theme = current === "dark" ? "light" : "dark";
            localStorage.setItem(STORAGE_KEY, nextTheme);
            document.documentElement.classList.toggle("theme-light", nextTheme === "light");
            return nextTheme;
        });
    };

    return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) throw new Error("useTheme must be used within ThemeProvider");
    return context;
}
