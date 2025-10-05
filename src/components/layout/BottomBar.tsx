import { Button } from "@/components/ui/button";
import { Undo2, X, Star, Heart, Zap } from "lucide-react";

type Props = {
  onNope: () => void;
  onLike: () => void;
  onSuperLike: () => void;
  onBoost?: () => void;
  onUndo?: () => void;
};

export default function BottomBar({ onNope, onLike, onSuperLike, onBoost, onUndo }: Props) {
  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 border-t bg-background/80 backdrop-blur sm:static sm:mt-4 sm:border-0 sm:bg-transparent">
      <div className="mx-auto grid max-w-screen-sm grid-cols-5 gap-3 px-4 py-3 sm:max-w-screen-md sm:justify-center sm:gap-4">
        <Button variant="secondary" size="icon" className="h-12 w-12 rounded-full" onClick={onUndo}>
          <Undo2 />
        </Button>
        <Button variant="destructive" size="icon" className="h-14 w-14 rounded-full" onClick={onNope}>
          <X />
        </Button>
        <Button variant="secondary" size="icon" className="h-12 w-12 rounded-full" onClick={onSuperLike}>
          <Star />
        </Button>
        <Button variant="default" size="icon" className="h-14 w-14 rounded-full" onClick={onLike}>
          <Heart />
        </Button>
        <Button variant="secondary" size="icon" className="h-12 w-12 rounded-full" onClick={onBoost}>
          <Zap />
        </Button>
      </div>
    </div>
  );
}
