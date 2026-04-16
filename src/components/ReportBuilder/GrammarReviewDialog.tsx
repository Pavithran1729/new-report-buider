import { useState, useEffect } from "react";
import { diffWordsWithSpace } from "diff";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Check, X, AlertCircle } from "lucide-react";

interface GrammarReviewDialogProps {
    isOpen: boolean;
    onClose: () => void;
    originalText: string;
    revisedText: string;
    onAccept: (revisedText: string) => void;
}

export function GrammarReviewDialog({
    isOpen,
    onClose,
    originalText,
    revisedText,
    onAccept,
}: GrammarReviewDialogProps) {
    const [diffParts, setDiffParts] = useState<any[]>([]);
    const [stats, setStats] = useState({ additions: 0, deletions: 0 });

    useEffect(() => {
        if (isOpen && originalText && revisedText) {
            // Calculate word-level differences
            const parts = diffWordsWithSpace(originalText, revisedText);
            setDiffParts(parts);

            // Calculate statistics
            let additions = 0;
            let deletions = 0;
            parts.forEach(part => {
                // Rough count of words based on spaces
                const wordCount = (part.value.match(/\S+/g) || []).length;
                if (part.added) additions += wordCount;
                if (part.removed) deletions += wordCount;
            });

            setStats({ additions, deletions });
        }
    }, [isOpen, originalText, revisedText]);

    const handleAccept = () => {
        onAccept(revisedText);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col glass-morphism border-primary/20">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <span className="text-purple-500">✨</span> Review Grammar Changes
                    </DialogTitle>
                    <DialogDescription>
                        The AI has reviewed your text. Please review the suggested changes before applying them.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-4 mb-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200">
                        +{stats.additions} words added
                    </Badge>
                    <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200">
                        -{stats.deletions} words removed
                    </Badge>
                    {(stats.additions === 0 && stats.deletions === 0) && (
                        <Badge variant="outline" className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> No changes detected
                        </Badge>
                    )}
                </div>

                <ScrollArea className="flex-1 bg-muted/30 p-4 rounded-md border border-border mt-2 h-[50vh] prose prose-sm max-w-none dark:prose-invert">
                    <div className="whitespace-pre-wrap leading-relaxed font-mono text-sm">
                        {diffParts.map((part, index) => {
                            if (part.added) {
                                return (
                                    <span key={index} className="bg-green-200 text-green-900 dark:bg-green-900/50 dark:text-green-100 px-1 rounded mx-0.5 font-medium">
                                        {part.value}
                                    </span>
                                );
                            }
                            if (part.removed) {
                                return (
                                    <span key={index} className="bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-200 px-1 rounded mx-0.5 line-through decoration-red-500 opacity-70">
                                        {part.value}
                                    </span>
                                );
                            }
                            // Unchanged text
                            return <span key={index} className="text-foreground/90">{part.value}</span>;
                        })}
                    </div>
                </ScrollArea>

                <DialogFooter className="sm:justify-between mt-4">
                    <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="mr-2 h-4 w-4" /> Discard
                    </Button>
                    <Button
                        onClick={handleAccept}
                        disabled={stats.additions === 0 && stats.deletions === 0}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                        <Check className="mr-2 h-4 w-4" /> Accept Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
