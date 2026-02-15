import { Sun, Moon, CloudSun } from "lucide-react";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { resetAllProgress, setSelectedDate } from "@/lib/timeState";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export function GreetingHeader() {
  const [resetOpen, setResetOpen] = useState(false);
  const hour = new Date().getHours();
  let Icon = Sun;
  if (hour >= 12 && hour < 17) Icon = CloudSun;
  else if (hour >= 17 || hour < 5) Icon = Moon;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <Icon className="w-4 h-4" />
          <span>{today}</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          What should you execute next?
        </h1>
        <p className="text-muted-foreground mt-1">
          One Must-Do. Up to two optional. Focus, then ship.
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setResetOpen(true)}
        className="hidden md:flex"
      >
        <RotateCcw className="w-4 h-4 mr-1" />
        Reset
      </Button>
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset progress?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears all stored progress and entities across the app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetAllProgress();
                setSelectedDate(new Date());
                setResetOpen(false);
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
