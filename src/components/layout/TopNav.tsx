import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Flame, MessagesSquare, Heart, User } from "lucide-react";

export default function TopNav() {
  const { pathname } = useLocation();
  const title =
    pathname === "/matches" ? "Matches" :
    pathname === "/chat" ? "Chats" :
    pathname === "/models" ? "Modelos Entrenados" : "Clasificador";

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-screen-md items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <Flame className="h-6 w-6 text-primary" />
          <span className="font-semibold">Exo Tinder</span>
        </Link>
        <h1 className="text-sm font-medium">{title}</h1>
        <nav className="hidden gap-4 sm:flex">
          <Link className={cn("text-sm hover:underline", pathname === "/" && "text-primary")} to="/">Clasifica</Link>
          <Link className={cn("text-sm hover:underline", pathname === "/matches" && "text-primary")} to="/matches">Matches</Link>
          {/* Changed "Profile" to "Models" 
          <Link className={cn("text-sm hover:underline", pathname === "/chat" && "text-primary")} to="/chat">Chat</Link>
          */}
          <Link className={cn("text-sm hover:underline", pathname === "/models" && "text-primary")} to="/models">Mis modelos</Link>
        </nav>
        {/* Atajos móviles */}
        <div className="flex items-center gap-3 sm:hidden">
          <Link to="/matches"><Heart className="h-5 w-5" /></Link>
          <Link to="/chat"><MessagesSquare className="h-5 w-5" /></Link>
          <Link to="/profile"><User className="h-5 w-5" /></Link>
        </div>
      </div>
    </header>
  );
}
