import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/geist/400.css";
import "@fontsource/geist/500.css";
import "@fontsource/geist/600.css";
import "./style.css";
import "./theme.css";
import { TOKEN_KEY } from "./api.js";
import Login from "./Login.jsx";
import Workspace from "./Workspace.jsx";

function App() {
  const [dark, setDark] = useState(
    () => localStorage.getItem("campus_theme") === "dark",
  );
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("campus_theme", dark ? "dark" : "light");
  }, [dark]);
  if (location.pathname !== "/login" && !sessionStorage.getItem(TOKEN_KEY)) {
    location.replace("/login");
    return null;
  }
  const themeProps = { dark, onToggleTheme: () => setDark((value) => !value) };
  return location.pathname === "/login" ? (
    <Login {...themeProps} />
  ) : (
    <Workspace {...themeProps} />
  );
}

createRoot(document.getElementById("root")).render(<App />);
