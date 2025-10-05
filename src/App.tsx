import { Route, Routes } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import Home from "@/pages/Home";
import Matches from "@/pages/Matches";
import Chat from "@/pages/Chat";
import Models from "@/pages/Models";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/models" element={<Models />} />
      </Route>
    </Routes>
  );
}
