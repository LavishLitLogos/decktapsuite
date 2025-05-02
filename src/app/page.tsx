"use client";

import { Buffer } from 'buffer';

import React, { useState, useRef, useCallback, type ChangeEvent, type DragEvent } from "react";
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { UploadCloud, Link as LinkIcon, Copy, X, Download, Crown } from "lucide-react"; // Added Download icon and Crown icon
import { cn } from "@/lib/utils";

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

const MAX_IMAGES = 5;
const MIN_IMAGES = 3;

const PREMIUM_TRANSITIONS: TransitionStyle[] = [
  "transition-flip-behind",
  "transition-slide-fade",
  "transition-lift-drop",
  "transition-flip-dissolve",
];

// For demonstration purposes, replace with actual user authentication and role checking
const OWNER_EMAILS = [
  'deckcadence52@gmail.com',
  'r.bouknight88@gmail.com',
  'homerunroyce@gmail.com'
];


export default function Home() {
  const [deckItems, setDeckItems] = useState<DeckItem[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [transitionStyle, setTransitionStyle] = useState<TransitionStyle>("transition-flip-down");
  const [isDragging, setIsDragging] = useState(false);
  const [isDeckCreated, setIsDeckCreated] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const previousItemsRef = useRef<DeckItem[]>([]);

  // Dummy user state - In a real app, this would come from auth context/hook
  // For testing owner view, change the email here or implement a way to simulate login
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('deckcadence52@gmail.com'); // Replace with actual user email



  const isOwner = OWNER_EMAILS.includes(currentUserEmail);

  const [embedCode, setEmbedCode] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

   // Define handleUpgrade before handleTransitionChange
   const handleUpgrade = useCallback(async () => { // Wrap in useCallback
    // In a real application, you would likely create a checkout session
    // on your backend and redirect the user to the Stripe hosted page.
    try {
       let origin = '';
        try {
           // Ensure window exists (client-side)
           if (typeof window !== 'undefined') {
               origin = window.location.origin;
           } else {
              toast({ title: "Browser Error", description: "Cannot initiate upgrade without window context.", variant: "destructive" });
               return;
           }
        } catch (error: any) {
           toast({ title: "Browser Error", description: "Could not determine site origin for upgrade.", variant: "destructive" });
           return;
        }

      const response = await fetch('/api/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          successUrl: `${origin}/?success=true`, // Redirect back here on success
          origin: origin, // Send origin for cancel URL construction
        }),

      });

      const data = await response.json();

      if (response.ok && data.url) {
         // Ensure window exists before redirecting
         if (typeof window !== 'undefined') {
             window.location.href = data.url; // Redirect to Stripe Checkout page
         } else {
             console.error("Cannot redirect without window object.");
             toast({ title: "Upgrade Error", description: "Cannot redirect to checkout page.", variant: "destructive" });
         }

      } else {
        toast({
          title: "Upgrade Failed",
          description: data.error || "Could not create checkout session.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({ title: "Upgrade Failed", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    }
  }, []); // Empty dependency array as it doesn't depend on component state directly

    const handleTransitionChange = useCallback((value: string) => { // Changed parameter type to string
    if (!isOwner && PREMIUM_TRANSITIONS.includes(value as TransitionStyle)) {
        toast({
            title: "Premium Feature",
            description: "Upgrade to unlock this animation style.",
            variant: "destructive", // Or a custom variant
            action: <Button onClick={handleUpgrade}>Upgrade Now</Button>, // handleUpgrade is accessible via closure
        });
        return; // Prevent changing to a premium style if not owner
    }

    // Debounce the state update and shareable generation
    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
        const newStyle = value as TransitionStyle;
        setTransitionStyle(newStyle);
        if (deckItems.length >= MIN_IMAGES) {
            generateShareables(deckItems, newStyle);
        }
    }, 300); // Adjust the delay (in milliseconds) as needed
  }, [deckItems, isOwner, handleUpgrade]); // Added handleUpgrade to dependency array


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      processFiles(Array.from(files));
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const files = event.dataTransfer.files;
    if (files) {
      processFiles(Array.from(files));
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const processFiles = (files: File[]) => {
    if (deckItems.length + files.length > MAX_IMAGES) {
      toast({
        title: "Upload Limit Exceeded",
        description: `You can upload a maximum of ${MAX_IMAGES} images.`,
        variant: "destructive",
      });
      return;
    }

    const newItems: DeckItem[] = [];
    files.forEach(file => {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid File Type",
          description: `${file.name} is not a valid image file. Please upload images only.`,
          variant: "destructive",
        });
        return; // Skip this file
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const img = new window.Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              throw new Error("Could not get canvas context.");
            }

            const maxWidth = 500;
            const maxHeight = 500;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > maxWidth) {
                height = height * (maxWidth / width);
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = width * (maxHeight / height);
                height = maxHeight;
              }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            // Use canvas to get a Blob, then create an Object URL
            canvas.toBlob((blob) => {
              if (blob) {
                const imageUrl = URL.createObjectURL(blob);
                newItems.push({
                  id: crypto.randomUUID(),
                  imageUrl: imageUrl, // Use Object URL
                  link: "", // Initialize link as empty
                });
                // Check if all image files are processed
                if (newItems.length === files.filter(f => f.type.startsWith("image/")).length) {
                  setDeckItems(prev => {
                    const updatedItems = [...prev, ...newItems];
                    // Only generate link if min images are met after adding new ones
                    if (updatedItems.length >= MIN_IMAGES) {
                      generateShareables(updatedItems, transitionStyle);
                    } else {
                      setShareLink(null);
                      setEmbedCode(null);
                    }
                    return updatedItems;
                  });
                }
              } else {
                toast({
                  title: "Error Resizing Image",
                  description: `Could not create blob from canvas for ${file.name}.`,
                  variant: "destructive",
                });
              }
            }, file.type); // Preserve original image type
          };
          img.onerror = () => {
             toast({
              title: "Error Loading Image",
              description: `Could not load image file ${file.name} for resizing.`,
              variant: "destructive",
             });
          };
          img.src = e.target?.result as string; // Load image from Data URL initially for resizing
        } catch (error: any) {
          toast({
            title: "Error Processing Image",
            description: `Could not process image ${file.name}: ${error.message}`,
            variant: "destructive",
          });
        }
      };
      reader.onerror = (error) => {
        toast({
          title: "Error Reading File",
          description: `Could not read file ${file.name}.`,
          variant: "destructive",
        });
      };
      // Read file as Data URL to use with Image object for resizing
      try {
        reader.readAsDataURL(file);
      } catch (error: any) {
        toast({
          title: "Error Reading File",
          description: `Could not read file ${file.name}: ${error.message}`,
          variant: "destructive",
        });
      }
    });
  };

  // Cleanup object URLs when deckItems change or component unmounts
  React.useEffect(() => {
    return () => {
      deckItems.forEach(item => {
        // Check if the imageUrl is an Object URL before revoking
        if (item.imageUrl.startsWith('blob:')) {
          URL.revokeObjectURL(item.imageUrl);
        };
      });
    };
  }, [deckItems]); // Depend on deckItems

   const handleLinkChange = (id: string, link: string) => {
    const updatedItems = deckItems.map(item =>
      item.id === id ? { ...item, link } : item
    );
    setDeckItems(updatedItems);
     if (updatedItems.length >= MIN_IMAGES) {
         generateShareables(updatedItems, transitionStyle);
    }
  };

  const handleRemoveItem = (idToRemove: string) => {
      const newItems = deckItems.filter(item => item.id !== idToRemove);
      setDeckItems(newItems);
      setIsDeckCreated(false); // Reset deck creation state
     if (newItems.length < MIN_IMAGES && deckItems.length >= MIN_IMAGES) {
        setShareLink(null);
        setEmbedCode(null);
        setCurrentCardIndex(0); // Reset index if below minimum
        toast({
            title: "Minimum Images Required",
            description: `Please upload at least ${MIN_IMAGES} images to generate share links.`,
        });
      } else if (newItems.length >= MIN_IMAGES) { // Ensure generation only happens if still >= MIN_IMAGES
        // Adjust index if the removed card was the last one and index is now out of bounds
        setCurrentCardIndex(prevIndex => Math.min(prevIndex, newItems.length > 0 ? newItems.length - 1 : 0));
         generateShareables(newItems, transitionStyle);
      } else {
         // Reset index if below minimum and no toast was shown (e.g., removing from 2 to 1)
        setCurrentCardIndex(0);
      }
  };

  const handleCardTap = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent transition if clicking the link icon by checking the event target
     if ((e.target as HTMLElement).closest('.card-link-icon')) {
       return;
     }

    if (deckItems.length > 1) { // Only transition if more than one card
       // Use requestAnimationFrame to ensure the state update happens
       // after the current event loop tick, allowing CSS transitions to start smoothly.
       requestAnimationFrame(() => {
         setCurrentCardIndex((prevIndex) => (prevIndex + 1) % deckItems.length);
       });
    }
  };


   const handleLinkIconClick = (e: React.MouseEvent<HTMLButtonElement>, link: string) => {
    e.stopPropagation(); // Prevent card tap event
    if (link) {
      window.open(link, "_blank", "noopener,noreferrer");
    } else {
       toast({
        title: "No Link Assigned",
        description: "Please assign a URL to this card first.",
       })
    }
  };

   const generateShareables = useCallback((items: DeckItem[], style: TransitionStyle) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Check if items array has changed compared to the previous call
    // Simple length check and comparing stringified versions (less efficient but reliable)
    // A more performant approach might involve deep comparison if necessary
    const itemsChanged = JSON.stringify(items) !== JSON.stringify(previousItemsRef.current);

    previousItemsRef.current = items; // Update the ref with the current item
    timeoutRef.current = setTimeout(() => {
      if (items.length < MIN_IMAGES) return; // Don't generate if not enough images

      try {
        const data = { items, style };
        let encodedData;
        try { // Use Buffer for base64 encoding to ensure compatibility in all environments
            encodedData = Buffer.from(JSON.stringify(data)).toString('base64');
        } catch (error: any) {
             toast({
              title: "Error Encoding Data",
              description: `Could not encode deck data: ${error.message}`,
              variant: "destructive",
             });
             return; // Stop execution if encoding fails
        }

        let origin = '';
        try {
           // Ensure window exists (client-side)
           if (typeof window !== 'undefined') {
               origin = window.location.origin;
           } else {
               console.warn("window is not defined, cannot determine origin for share link.");
               // Provide a fallback or handle server-side case if necessary
               origin = 'YOUR_DEPLOYED_URL'; // Replace with your actual base URL
           }
        } catch (error: any) {
           toast({ title: "Browser Error", description: "Could not determine site origin.", variant: "destructive" });
           return;
        }
        const shareUrl = `${origin}/view#${encodedData}`;
        const embedHtml = `<iframe src="${shareUrl}" width="320" height="420" style="border:none; border-radius: 0.5rem; box-shadow: 0 4px 15px rgba(0,0,0,0.2);" allowfullscreen title="DeckTap Deck"></iframe>`; // Added styles and title
        setShareLink(shareUrl);
        setEmbedCode(embedHtml);
      } catch (error: any) {
          toast({
            title: "Error Generating Shareables",
            description: error instanceof Error ? error.message : "An unknown error occurred.",
            variant: "destructive",
           });
       }
    }, 300); // Adjust the delay (in milliseconds) as needed
  }, []); // Added generateShareables as dependency for handleTransitionChange


  const copyToClipboard = (text: string | null, type: string) => {
    if (!text) return;
    // Ensure navigator exists (client-side)
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
        toast({
            title: `${type} Copied!`,
            description: `${type} has been copied to your clipboard.`,
        });
        }).catch(err => {
        toast({
            title: "Copy Failed",
            description: `Could not copy ${type}: ${err instanceof Error ? err.message : String(err)}`,
            variant: "destructive",
        });
        });
    } else {
         toast({
            title: "Copy Failed",
            description: "Clipboard API not available in this environment.",
            variant: "destructive",
        });
    }
  };


  const getCardClassName = (index: number): string => {
    const totalCards = deckItems.length;
    if (totalCards === 0) return '';

    const normalizedIndex = (index - currentCardIndex + totalCards) % totalCards;

    if (normalizedIndex === 0) return "current";
    if (normalizedIndex === 1) return "next";
    // Use totalCards - 1 for previous to handle wrap around correctly
    if (normalizedIndex === totalCards - 1) return "previous";
    return "hidden-card"; // Or some other class to hide non-adjacent cards
  };

  const generateStandaloneHtml = (items: DeckItem[], style: TransitionStyle): string => {
    // Ensure items have valid data before proceeding
    if (!items || items.length === 0 || !style) {
        console.error("Invalid data passed to generateStandaloneHtml");
        return ""; // Return empty string or throw an error
    }

    const itemHtml = items.map((item, index) => {
        if (!item || !item.id || !item.imageUrl) {
            console.warn(`Skipping invalid item at index ${index}`);
            return ''; // Skip invalid items
        }
        return `
      <div
        id="card-${item.id}"
        class="card-item"
        data-index="${index}"
        data-link="${item.link || ''}"
        style="z-index: ${items.length - index}; opacity: ${index === 0 ? 1 : 0}; transform: translateZ(0px);"
      >
        <img src="${item.imageUrl}" alt="Card ${index + 1}" loading="lazy" />
        ${item.link ? `
          <button class="card-link-icon" aria-label="Open link in new tab" data-link="${item.link}">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
          </button>
        ` : ''}
      </div>
    `;
    }).join('');

    if (!itemHtml) {
        console.error("No valid items found to generate HTML.");
        return "";
    }

    // Fetch relevant CSS from globals.css (or define inline styles)
    // NOTE: Including essential styles directly.
    // A more robust solution might link to an external CSS file or embed critical parts.
    const css = `
      :root { /* Define theme variables directly for standalone */
        --background: 120 100% 3%;
        --foreground: 48 100% 95%;
        --card: 120 85% 5%;
        --card-foreground: 48 100% 95%;
        --primary: 51 100% 55%;
        --primary-glow: 0 0 8px hsla(var(--primary), 0.5);
        --accent: 51 80% 65%;
        --border: 120 60% 12%;
        --radius: 0.5rem;
      }
      body { margin: 0; background-color: hsl(var(--background)); display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: Impact, Arial Black, sans-serif; }
      .card-stack-container { perspective: 1000px; position: relative; width: 300px; height: 400px; }
      .card-item { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: var(--radius); overflow: hidden; backface-visibility: hidden; transform-style: preserve-3d; transition: transform 0.7s ease-out, opacity 0.7s ease-out; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.2); border: 1px solid hsl(var(--border)); background-color: hsl(var(--card)); opacity: 0; pointer-events: none; /* Initially hidden */ }
      .card-item.current, .card-item.next, .card-item.previous { pointer-events: auto; } /* Make relevant cards interactive */
      .card-item img { display: block; width: 100%; height: 100%; object-fit: cover; }
      .card-link-icon { position: absolute; bottom: 1rem; right: 1rem; padding: 0.5rem; background-color: hsla(var(--background), 0.7); border-radius: 50%; color: hsl(var(--primary)); z-index: 10; transition: background-color 0.3s, color 0.3s, box-shadow 0.3s; border: none; cursor: pointer; box-shadow: var(--primary-glow); display: flex; align-items: center; justify-content: center; pointer-events: auto !important; /* Ensure link icon is always clickable */ }
      .card-link-icon:hover { background-color: hsla(var(--background), 0.9); color: hsl(var(--accent)); }
      .card-link-icon svg { width: 1.25rem; height: 1.25rem; }
      .hidden-card { opacity: 0 !important; transform: scale(0.8) !important; pointer-events: none !important; z-index: -1 !important; } /* Ensure non-visible cards are truly hidden */

      /* --- Transition Styles --- */
      /* Base state for current card */
      .card-item.current { transform: translateZ(0px); opacity: 1; z-index: 2; }

      /* Flip Down */
      .transition-flip-down .card-item { transform-origin: top center; }
      .transition-flip-down .card-item.next { transform: rotateX(-90deg) translateZ(-20px) translateY(-20px); opacity: 0; z-index: 1; }
      .transition-flip-down .card-item.previous { transform: rotateX(90deg) translateZ(-20px) translateY(20px); opacity: 0; z-index: 0; }

      /* Flip Behind */
      .transition-flip-behind .card-item { transform-origin: center center; }
      .transition-flip-behind .card-item.next { transform: rotateY(180deg) translateZ(-50px); opacity: 0; z-index: 1; }
      .transition-flip-behind .card-item.previous { transform: rotateY(-180deg) translateZ(-50px); opacity: 0; z-index: 0; }

      /* Slide Fade */
      .transition-slide-fade .card-item { transform-origin: center center; }
      .transition-slide-fade .card-item.next { transform: translateX(100%) translateY(-20px) scale(0.9); opacity: 0; z-index: 1; }
      .transition-slide-fade .card-item.previous { transform: translateX(-100%) translateY(-20px) scale(0.9); opacity: 0; z-index: 0; }

      /* Lift Up/Drop Down */
      .transition-lift-drop .card-item { transform-origin: center bottom; }
      .transition-lift-drop .card-item.next { transform: translateY(-100%) translateZ(-30px); opacity: 0; z-index: 1; }
      .transition-lift-drop .card-item.previous { transform: translateY(100%) translateZ(-30px); opacity: 0; z-index: 0; }

      /* Flip + Dissolve */
      .transition-flip-dissolve .card-item { transform-origin: center center; }
      .transition-flip-dissolve .card-item.next { transform: rotateY(90deg) scale(0.8); opacity: 0; z-index: 1; }
      .transition-flip-dissolve .card-item.previous { transform: rotateY(-90deg) scale(0.8); opacity: 0; z-index: 0; }
    `;

    const script = `
      document.addEventListener('DOMContentLoaded', () => {
          let currentCardIndex = 0;
          // Parse items safely, providing an empty array as fallback
          let items = [];
          try {
            items = JSON.parse('${JSON.stringify(items)}');
            if (!Array.isArray(items)) throw new Error("Parsed data is not an array");
          } catch (e) {
            console.error("Failed to parse items data:", e);
            // Handle error, maybe show a message to the user
            return; // Stop execution if data is invalid
          }

          const totalCards = items.length;
          const container = document.getElementById('deck-viewer-standalone');
          if (!container) {
              console.error("Container element not found.");
              return; // Stop if container is missing
          }
          if (totalCards === 0) {
              console.warn("No cards to display.");
              container.innerHTML = '<p style="color: hsl(var(--foreground));">No cards in this deck.</p>';
              return; // Stop if no cards
          }

          // let isTransitioning = false; // Flag to prevent rapid clicks - CSS handles this now

          function getCardClass(index, currentIndex) {
              if (totalCards === 0) return 'hidden-card'; // Handle empty case
              const normalizedIndex = (index - currentIndex + totalCards) % totalCards;
              if (normalizedIndex === 0) return "current";
              if (normalizedIndex === 1 || totalCards === 1) return "next"; // Ensure 'next' is assigned even with 1 card
              if (normalizedIndex === totalCards - 1) return "previous";
              return "hidden-card";
          }

          function updateCards() {
              // Removed isTransitioning check
              if (!container) return;

              const cardElements = container.querySelectorAll('.card-item');
              cardElements.forEach((card, index) => {
                  if (card instanceof HTMLElement) { // Type guard
                      card.className = 'card-item ' + getCardClass(index, currentCardIndex);
                       // No need to manage opacity/z-index directly, CSS handles it based on classes
                  }
              });

              // Removed direct style manipulation for opacity/z-index
              // Removed setTimeout logic as CSS handles transition timing
          }

          container.addEventListener('click', (e) => {
              // Removed isTransitioning check

              const linkButton = (e.target).closest('.card-link-icon');
              if (linkButton instanceof HTMLElement) {
                  const link = linkButton.getAttribute('data-link');
                  if (link) {
                      e.stopPropagation();
                      window.open(link, '_blank', 'noopener,noreferrer');
                  }
              } else if ((e.target).closest('.card-item.current')) { // Only transition if current card is clicked
                  if (totalCards > 1) { // Only advance if there's more than one card
                    // Use requestAnimationFrame for smoother transition start
                    requestAnimationFrame(() => {
                        currentCardIndex = (currentCardIndex + 1) % totalCards;
                        updateCards();
                    });
                  }
              }
          });

          // Initial setup
          updateCards(); // Run once to set initial classes and styles
      });
    `;

    // Ensure DOCTYPE is present
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DeckTap Deck</title>
  <style>${css}</style>
</head>
<body>
  <div id="deck-viewer-standalone" class="card-stack-container ${style}">
    ${itemHtml}
  </div>
  <script>${script}</script>
</body>
</html>`;
  };

  const handleDownload = () => {
     if (deckItems.length < MIN_IMAGES) {
       toast({
         title: "Cannot Download",
         description: `You need at least ${MIN_IMAGES} cards to download the deck.`,
         variant: "destructive",
       });
       return;
     }

 let htmlContent: string;
     try {
         htmlContent = generateStandaloneHtml(deckItems, transitionStyle);
     } catch (error: any) {
          toast({
             title: "Error Generating HTML",
             description: `Could not generate the deck HTML: ${error.message}`,
             variant: "destructive",
           });
           return; // Stop if HTML generation failed
      }

     try {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
 link.href = url;
 link.download = 'decktap-deck.html';
 link.click();

        toast({
            title: "Download Started",
            description: "Your standalone deck HTML file is downloading.",
        });
     } catch (error: any) {
        toast({
         title: "Download Failed",
         description: `Could not initiate the download: ${error.message}`,
         variant: "destructive",
       });
     } finally {
         // Cleanup: Remove the link and revoke the object URL
         if (link && document.body.contains(link)) {
            document.body.removeChild(link);
         }
         if (url) {
            URL.revokeObjectURL(url);
         }
     }
   };


  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 items-start">
      {/* Left Column: Controls */}
      <Card className="w-full lg:w-1/3">
        <CardHeader>
          {/* Apply text-primary class for glow effect */}
          <CardTitle className="text-2xl font-heading text-primary">DeckTap Suite™</CardTitle>
          <CardDescription>Create your interactive card deck.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Image Upload */}
          <div
            className={cn("upload-area",
              "border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors",
              isDragging && "border-primary bg-muted/50"
            )}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
              disabled={deckItems.length >= MAX_IMAGES}
            />
            <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {isDragging ? "Drop images here" : `Drag & drop ${deckItems.length < MAX_IMAGES ? MAX_IMAGES - deckItems.length : 0} more image(s) or click to upload`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Max {MAX_IMAGES} images. ({MIN_IMAGES} minimum required)</p>
             {deckItems.length >= MAX_IMAGES && <p className="text-destructive text-sm mt-2">Maximum images reached.</p>}
          </div>

           {/* Image Previews & Link Inputs */}
          {deckItems.length > 0 && (
            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
              <h3 className="text-lg font-medium font-heading">Your Cards ({deckItems.length}/{MAX_IMAGES})</h3>
              {deckItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2 border rounded-md bg-card/80">
                  <Image src={item.imageUrl} alt="Uploaded thumbnail" width={40} height={40} className="rounded object-cover" />
                  <Input
                    type="url"
                    placeholder="https://"
                    value={item.link}
                    onChange={(e) => handleLinkChange(item.id, e.target.value)}
                    className="flex-grow text-sm h-8"
                    aria-label={`Link for card ${item.id}`} // Accessibility
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemoveItem(item.id)} aria-label={`Remove card ${item.id}`}>
                      <X className="h-4 w-4"/>
                       <span className="sr-only">Remove Item</span>
                  </Button>
                </div>
              ))}
            </div>
          )}


          {/* Transition Style Selector */}
          <div className="space-y-2">
            <Label htmlFor="transition-style" className="font-heading">Transition Style</Label>
            <Select value={transitionStyle} onValueChange={handleTransitionChange}>
              <SelectTrigger id="transition-style">
                <SelectValue placeholder="Select transition" />
              </SelectTrigger>
              <SelectContent>
                 <SelectItem value="transition-flip-down">Flip Down</SelectItem>
                 {isOwner ? (
                    <>
                        <SelectItem value="transition-flip-behind">
                            Flip Behind
                        </SelectItem>
                        <SelectItem value="transition-slide-fade">
                            Slide Fade
                        </SelectItem>
                        <SelectItem value="transition-lift-drop">
                            Lift Up / Drop Down
                        </SelectItem>
                        <SelectItem value="transition-flip-dissolve">
                            Flip + Dissolve
                        </SelectItem>
                    </>
                 ) : (
                    <>
                        {/* Optionally show disabled premium options with Crown */}
                        {/* Removed disabled premium options to not show them */}
                    </>
                 )}
              </SelectContent>

            </Select>
             {!isOwner && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                <Crown className="inline-block w-3 h-3 text-primary" /> Upgrade to unlock premium styles.
              </p>
            )}
          </div>
        </CardContent>
        {/* Upgrade Button (Visible if not owner) */}
        {!isOwner && (
          <CardFooter className="flex justify-center pt-0 border-t border-border mt-4 flex-col items-center gap-4"> {/* Added flex-col items-center gap-4 */}
            <Button onClick={handleUpgrade} className="w-full flex items-center gap-2 mt-4"><Crown className="w-5 h-5"/> Unlock Premium Animations</Button>
         </CardFooter>
        )}
         <CardFooter className="flex-col items-start gap-4 pt-4 border-t border-border">
             {deckItems.length >= MIN_IMAGES && !isDeckCreated && (
                <Button onClick={() => setIsDeckCreated(true)} className="w-full">Create Deck</Button>
            )}
           {deckItems.length < MIN_IMAGES && deckItems.length > 0 && (
                 <p className="text-sm text-muted-foreground pt-4">Upload at least {MIN_IMAGES} images to generate share links and download.</p>
            )}
            {deckItems.length === 0 && (
                <p className="text-sm text-muted-foreground pt-4">Upload images to create and share your deck.</p>
            )}
         </CardFooter>
      </Card>

      {/* Right Column: Card Preview */}
      <div className="w-full lg:w-2/3 flex items-center justify-center p-4 lg:p-16">
         {isDeckCreated && deckItems.length >= MIN_IMAGES ? (\
            <>
             <div className={cn("card-stack-container", transitionStyle)} onClick={handleCardTap}>
                {deckItems.map((item, index) => (
                <div
                    key={item.id}
                    className={cn("card-item", getCardClassName(index))}
                    data-ai-hint="card background"
                    role="button" // Indicate it's clickable
                    tabIndex={index === currentCardIndex ? 0 : -1} // Make current card focusable
                    aria-label={`Card ${index + 1}. Tap to view next card.`}
                >
                    <Image
                     src={item.imageUrl}
                     alt={`Card ${index + 1}`}
                     fill // Use fill for better responsiveness within the container
                     sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" // Provide sizes for optimization
                     style={{ objectFit: 'cover' }} // Ensure image covers the card area
                     priority={index === currentCardIndex} // Prioritize loading the current image
                     // Consider removing unoptimized if images are not always data URIs
                     // unoptimized
                    />
                    {item.link && (
                        <button
                            className="card-link-icon"
                            onClick={(e) => handleLinkIconClick(e, item.link)}
                            aria-label="Open link in new tab"
                            tabIndex={index === currentCardIndex ? 0 : -1} // Make link focusable only on current card
                        >
                            <LinkIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>
                ))}
             </div>
            ) : (
             <div className="w-[300px] h-[400px] border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                <Button className="mb-4" onClick={() => fileInputRef.current?.click()}>Upload Images</Button>
                <p className="text-sm empty-state-text mb-4">Upload {MIN_IMAGES}-{MAX_IMAGES} images to get started.</p>
             </div>
            )}
      </div>
    </div>
  );
}
