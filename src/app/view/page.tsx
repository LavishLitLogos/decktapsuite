'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast'; // Assuming use-toast handles client-side toasts

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
  // const [isTransitioning, setIsTransitioning] = useState(false); // Temporarily remove for debugging delay

  // Read data from hash fragment on client-side mount
  useEffect(() => {
    const hash = window.location.hash.substring(1); // Get data after #
    if (hash) {
      try {
        const decodedData = atob(hash); // Decode Base64
        const parsedData = JSON.parse(decodedData) as DeckData;

        // Basic validation
        if (parsedData && Array.isArray(parsedData.items) && parsedData.style) {
             const validItems = parsedData.items.filter(item => item && item.id && item.imageUrl); // Add check for item itself
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
       return; // Prevent transition if clicking the link icon
     }
     // if (isTransitioning) return; // Re-enable if needed

     if (deckData && deckData.items.length > 1) { // Only transition if more than one card
       // setIsTransitioning(true); // Re-enable if needed
       setCurrentCardIndex((prevIndex) => (prevIndex + 1) % deckData.items.length);
       // Reset flag after transition duration
       // setTimeout(() => setIsTransitioning(false), 700); // Match CSS duration - Re-enable if needed
     }
   };

  const handleLinkIconClick = (e: React.MouseEvent<HTMLButtonElement>, link: string) => {
    e.stopPropagation(); // Prevent card tap event
    if (link) {
      window.open(link, "_blank", "noopener,noreferrer");
    } else {
       // Check if toast hook is available before calling
       if (toast) {
           toast({
             title: "No Link Assigned",
             description: "This card does not have an assigned URL.",
           });
       } else {
           console.warn("Toast function not available.");
           // Optionally provide a simple alert fallback
           // alert("This card does not have an assigned URL.");
       }
    }
  };

   const getCardClassName = (index: number): string => {
    if (!deckData || deckData.items.length === 0) return '';
    const totalCards = deckData.items.length;
    const normalizedIndex = (index - currentCardIndex + totalCards) % totalCards;

    if (normalizedIndex === 0) return "current";
    // Ensure 'next' is applied correctly even with 1 card for potential future logic
    if (normalizedIndex === 1 || totalCards === 1) return "next";
    if (normalizedIndex === totalCards - 1) return "previous";
    // Return a specific class for hidden cards for explicit styling
    return "hidden-card";
  };


  if (isLoading) {
    // Use theme foreground color
    return <div className="flex items-center justify-center h-screen text-foreground">Loading Deck...</div>;
  }

  if (error) {
    // Use theme destructive color (implicitly handled by text-destructive in globals.css)
    return <div className="flex items-center justify-center h-screen text-destructive p-4 text-center">{error}</div>;
  }

  if (!deckData || deckData.items.length === 0) {
     // Use theme muted foreground color
     return <div className="flex items-center justify-center h-screen text-muted-foreground">No deck to display.</div>;
  }

  // The main layout likely provides the background. This centers the stack.
  return (
     <div className="flex items-center justify-center w-full h-full p-4 min-h-screen"> {/* Ensure full height */}
        {/* Apply transition style class to the container */}
        <div className={cn("card-stack-container", deckData.style)} role="region" aria-label="Interactive Card Deck">
        {deckData.items.map((item, index) => (
            <div
                key={item.id}
                // Apply dynamic classes for current, next, previous, hidden
                className={cn("card-item", getCardClassName(index))}
                onClick={handleCardTap}
                // Let CSS handle z-index based on class for smoother transitions
                data-ai-hint="shared card background"
                role="button" // Accessibility
                tabIndex={index === currentCardIndex ? 0 : -1} // Accessibility
                aria-label={`Card ${index + 1}. ${getCardClassName(index) === 'current' ? 'Tap to view next card.' : ''}`}
                aria-hidden={getCardClassName(index) !== 'current'} // Hide non-current cards from screen readers
            >
            <Image
                src={item.imageUrl}
                alt={`Card ${index + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 300px" // Provide appropriate sizes
                style={{ objectFit: 'cover' }}
                priority={index === currentCardIndex}
                // unoptimized // Important for Base64/Data URIs, remove if using external URLs primarily
            />
             {item.link && (
                 <button
                     className="card-link-icon"
                     onClick={(e) => handleLinkIconClick(e, item.link)}
                     aria-label="Open link in new tab"
                     tabIndex={index === currentCardIndex ? 0 : -1} // Accessibility
                     // Prevent button from being announced when card is hidden
                     aria-hidden={getCardClassName(index) !== 'current'}
                  >
                    {/* Use Lucide Icon */}
                    <LinkIcon className="h-5 w-5" />
                 </button>
                )}
            </div>
        ))}
        </div>
     </div>
  );
}

    