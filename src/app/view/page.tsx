'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation'; // Correct hook for App Router search params
import { Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface DeckItem {
  id: string;
  imageUrl: string;
  link: string;
}

type TransitionStyle =
  | "transition-flip-down"
  | "transition-flip-behind"
  | "transition-slide-fade"
  | "transition-lift-drop"
  | "transition-flip-dissolve";

interface DeckData {
    items: DeckItem[];
    style: TransitionStyle;
}


export default function ViewPage() {
  const [deckData, setDeckData] = useState<DeckData | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // No need for useSearchParams, we will read from hash fragment
  useEffect(() => {
    const hash = window.location.hash.substring(1); // Get data after #
    if (hash) {
      try {
        const decodedData = atob(hash); // Decode Base64
        const parsedData = JSON.parse(decodedData) as DeckData;

        // Basic validation
        if (parsedData && Array.isArray(parsedData.items) && parsedData.style) {
             // Further validation on items if needed
             const validItems = parsedData.items.filter(item => item.id && item.imageUrl);
             if (validItems.length !== parsedData.items.length) {
                 console.warn("Some invalid items were filtered out from the deck data.");
             }
             if (validItems.length > 0) {
                 setDeckData({...parsedData, items: validItems});
             } else {
                 setError("No valid card data found in the link.");
             }
        } else {
           setError("Invalid deck data format in the link.");
        }
      } catch (e) {
        console.error("Failed to decode or parse deck data:", e);
        setError("Failed to load deck data from the link. It might be corrupted or invalid.");
      }
    } else {
       setError("No deck data provided in the link.");
    }
    setIsLoading(false);
  }, []); // Run only once on mount


  const handleCardTap = (e: React.MouseEvent<HTMLDivElement>) => {
     if ((e.target as HTMLElement).closest('.card-link-icon')) {
      return;
    }
    if (deckData && deckData.items.length > 0) {
      setCurrentCardIndex((prevIndex) => (prevIndex + 1) % deckData.items.length);
    }
  };

  const handleLinkIconClick = (e: React.MouseEvent<HTMLButtonElement>, link: string) => {
    e.stopPropagation(); // Prevent card tap event
    if (link) {
      window.open(link, "_blank", "noopener,noreferrer");
    } else {
       toast({
        title: "No Link Assigned",
        description: "This card does not have an assigned URL.",
       })
    }
  };

   const getCardClassName = (index: number): string => {
    if (!deckData || deckData.items.length === 0) return '';
    const totalCards = deckData.items.length;
    const normalizedIndex = (index - currentCardIndex + totalCards) % totalCards;

    if (normalizedIndex === 0) return "current";
    if (normalizedIndex === 1) return "next";
    if (normalizedIndex === totalCards - 1) return "previous";
    return "hidden-card"; // Or some other class to hide non-adjacent cards
  };


  if (isLoading) {
    return <div className="flex items-center justify-center h-screen text-foreground">Loading Deck...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-destructive p-4 text-center">{error}</div>;
  }

  if (!deckData || deckData.items.length === 0) {
     return <div className="flex items-center justify-center h-screen text-muted-foreground">No deck to display.</div>;
  }

  return (
     // Apply background to the body or a full-screen container in layout.tsx if needed
     // This container centers the stack itself
     <div className="flex items-center justify-center w-full h-full p-4">
        <div className={cn("card-stack-container", deckData.style)}>
        {deckData.items.map((item, index) => (
            <div
                key={item.id}
                className={cn("card-item", getCardClassName(index))}
                onClick={handleCardTap}
                style={{ zIndex: deckData.items.length - Math.abs(currentCardIndex - index) }}
                data-ai-hint="shared card background"
            >
            <Image
                src={item.imageUrl}
                alt={`Card ${index + 1}`}
                fill
                style={{ objectFit: 'cover' }}
                priority={index === currentCardIndex}
            />
             {item.link && (
                 <button
                     className="card-link-icon"
                     onClick={(e) => handleLinkIconClick(e, item.link)}
                     aria-label="Open link in new tab"
                  >
                    <LinkIcon className="h-5 w-5" />
                 </button>
                )}
            </div>
        ))}
        </div>
     </div>
  );
}
