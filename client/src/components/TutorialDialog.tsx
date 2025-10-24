import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface TutorialDialogProps {
  message: string;
  onComplete?: () => void;
  needsInput?: boolean;
  inputLabel?: string;
  onInput?: (value: string) => void;
}

export default function TutorialDialog({
  message,
  onComplete,
  needsInput = false,
  inputLabel = "",
  onInput,
}: TutorialDialogProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    setDisplayedText("");
    setIsComplete(false);
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < message.length) {
        setDisplayedText(message.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [message]);

  const handleSubmit = () => {
    if (needsInput && inputValue.trim()) {
      onInput?.(inputValue.trim());
    } else if (!needsInput) {
      onComplete?.();
    }
  };

  return (
    <Card className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl p-6 bg-card/95 backdrop-blur border-primary/50 z-50" data-testid="tutorial-dialog">
      <div className="space-y-4">
        <div className="min-h-24 text-base leading-relaxed">
          {displayedText}
          {!isComplete && <span className="animate-pulse">|</span>}
        </div>

        {isComplete && needsInput && (
          <div className="space-y-3">
            <label className="text-sm font-semibold">{inputLabel}</label>
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Enter your name..."
                className="flex-1"
                autoFocus
                data-testid="input-player-name"
              />
              <Button 
                onClick={handleSubmit}
                disabled={!inputValue.trim()}
                data-testid="button-submit-name"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {isComplete && !needsInput && onComplete && (
          <Button 
            onClick={handleSubmit}
            className="w-full"
            data-testid="button-continue-tutorial"
          >
            Continue
          </Button>
        )}
      </div>
    </Card>
  );
}
