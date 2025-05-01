"use client";

import React, { useState, useRef, useCallback, type ChangeEvent, type DragEvent } from "react";
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { UploadCloud, Link as LinkIcon, Copy, Share2, X, Download } from "lucide-react"; // Added Download icon
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

export default function Home() {
  const [deckItems, setDeckItems] = useState<DeckItem[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [transitionStyle, setTransitionStyle] = useState<TransitionStyle>("transition-flip-down");
  const [isDragging, setIsDragging] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [embedCode, setEmbedCode] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      processFiles(Array.from(files));
    }
     // Reset file input to allow uploading the same file again
     if(fileInputRef.current) {
        fileInputRef.current.value = '';
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
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          newItems.push({
            id: crypto.randomUUID(),
            imageUrl: e.target?.result as string,
            link: "", // Initialize link as empty
          });
          // Check if all files are processed
          if (newItems.length === files.filter(f => f.type.startsWith("image/")).length) {
            setDeckItems(prev => [...prev, ...newItems]);
            // Only generate link if min images are met after adding new ones
            if (deckItems.length + newItems.length >= MIN_IMAGES) {
               generateShareables([...deckItems, ...newItems], transitionStyle);
            } else {
               setShareLink(null);
               setEmbedCode(null);
            }
          }
        };
        reader.readAsDataURL(file);
      } else {
         toast({
            title: "Invalid File Type",
            description: `${file.name} is not a valid image file.`,
            variant: "destructive",
         })
      }
    });
  };

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
      if (newItems.length < MIN_IMAGES) {
        setShareLink(null);
        setEmbedCode(null);
        setCurrentCardIndex(0); // Reset index if below minimum
        toast({
            title: "Minimum Images Required",
            description: `Please upload at least ${MIN_IMAGES} images to generate share links.`,
        });
      } else {
        // Adjust index if the removed card was the last one and index is now out of bounds
        setCurrentCardIndex(prevIndex => Math.min(prevIndex, newItems.length - 1));
        generateShareables(newItems, transitionStyle);
      }
  };

  const handleCardTap = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent transition if clicking the link icon area (simple check)
     if ((e.target as HTMLElement).closest('.card-link-icon')) {
      return;
    }
    if (deckItems.length > 0) {
      setCurrentCardIndex((prevIndex) => (prevIndex + 1) % deckItems.length);
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

   const generateShareables = (items: DeckItem[], style: TransitionStyle) => {
    if (items.length < MIN_IMAGES) return; // Don't generate if not enough images

    const data = { items, style };
    const encodedData = btoa(JSON.stringify(data)); // Base64 encode
    const shareUrl = `${window.location.origin}/view#${encodedData}`;
    const embedHtml = `<iframe src="${shareUrl}" width="320" height="420" frameborder="0" allowfullscreen></iframe>`; // Adjust dimensions

    setShareLink(shareUrl);
    setEmbedCode(embedHtml);
  };

   const handleTransitionChange = (value: string) => {
      const newStyle = value as TransitionStyle;
      setTransitionStyle(newStyle);
       if (deckItems.length >= MIN_IMAGES) {
         generateShareables(deckItems, newStyle);
       }
    };


  const copyToClipboard = (text: string | null, type: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: `${type} Copied!`,
        description: `${type} has been copied to your clipboard.`,
      });
    }).catch(err => {
       toast({
        title: "Copy Failed",
        description: `Could not copy ${type}: ${err}`,
        variant: "destructive",
      });
    });
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
    const itemHtml = items.map((item, index) => `
      <div
        id="card-${item.id}"
        class="card-item"
        data-index="${index}"
        data-link="${item.link || ''}"
        style="z-index: ${items.length - index}; opacity: ${index === 0 ? 1 : 0};"
      >
        <img src="${item.imageUrl}" alt="Card ${index + 1}" />
        ${item.link ? `
          <button class="card-link-icon" aria-label="Open link in new tab" data-link="${item.link}">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
          </button>
        ` : ''}
      </div>
    `).join('');

    // Fetch relevant CSS from globals.css (or define inline styles)
    // NOTE: For simplicity, we'll include essential styles directly.
    // A more robust solution might fetch and embed the CSS file or critical parts.
    const css = `
      body { margin: 0; background-color: #081408; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: Impact, Arial Black, sans-serif; }
      .card-stack-container { perspective: 1000px; position: relative; width: 300px; height: 400px; }
      .card-item { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 0.5rem; overflow: hidden; backface-visibility: hidden; transform-style: preserve-3d; transition: transform 0.7s ease-in-out, opacity 0.7s ease-in-out; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.2); border: 1px solid #1f3d1f; background-color: #0d1a0d; }
      .card-item img { display: block; width: 100%; height: 100%; object-fit: cover; }
      .card-link-icon { position: absolute; bottom: 1rem; right: 1rem; padding: 0.5rem; background-color: rgba(8, 20, 8, 0.7); border-radius: 50%; color: #ffdb58; z-index: 10; transition: background-color 0.3s, color 0.3s, box-shadow 0.3s; border: none; cursor: pointer; box-shadow: 0 0 8px hsla(51, 100%, 55%, 0.5); display: flex; align-items: center; justify-content: center; }
      .card-link-icon:hover { background-color: rgba(8, 20, 8, 0.9); color: #ffe791; }
      .card-link-icon svg { width: 1.25rem; height: 1.25rem; }
      .hidden-card { opacity: 0 !important; pointer-events: none; transform: scale(0.8); } /* Ensure non-visible cards are truly hidden */
      /* Add transition styles based on 'style' parameter */
      .${style} .card-item.next { /* Simplified example - add all transition variations */ }
      .${style} .card-item.current { transform: rotateX(0deg) translateZ(0); opacity: 1; z-index: 2; }
      .${style} .card-item.previous { /* Simplified example */ }
      /* Include all transition variations from globals.css here, prefixing with .${style} */
      .transition-flip-down .card-item.next { transform: rotateX(-90deg) translateZ(-20px) translateY(-20px); opacity: 0; z-index: 1; }
      .transition-flip-down .card-item.previous { transform: rotateX(90deg) translateZ(-20px) translateY(20px); opacity: 0; z-index: 0; }
      .transition-flip-behind .card-item { transform-origin: center center; }
      .transition-flip-behind .card-item.next { transform: rotateY(180deg) translateZ(-50px); opacity: 0; z-index: 1; }
      .transition-flip-behind .card-item.previous { transform: rotateY(-180deg) translateZ(-50px); opacity: 0; z-index: 0; }
      .transition-slide-fade .card-item { transform-origin: center center; }
      .transition-slide-fade .card-item.next { transform: translateX(100%) translateY(-20px) scale(0.9); opacity: 0; z-index: 1; }
      .transition-slide-fade .card-item.previous { transform: translateX(-100%) translateY(-20px) scale(0.9); opacity: 0; z-index: 0; }
      .transition-lift-drop .card-item { transform-origin: center bottom; }
      .transition-lift-drop .card-item.next { transform: translateY(-100%) translateZ(-30px); opacity: 0; z-index: 1; }
      .transition-lift-drop .card-item.previous { transform: translateY(100%) translateZ(-30px); opacity: 0; z-index: 0; }
      .transition-flip-dissolve .card-item { transform-origin: center center; }
      .transition-flip-dissolve .card-item.next { transform: rotateY(90deg) scale(0.8); opacity: 0; z-index: 1; }
      .transition-flip-dissolve .card-item.previous { transform: rotateY(-90deg) scale(0.8); opacity: 0; z-index: 0; }
    `;

    const script = `
      let currentCardIndex = 0;
      const items = JSON.parse('${JSON.stringify(items)}'); // Pass items data
      const totalCards = items.length;
      const container = document.getElementById('deck-viewer-standalone');

      function getCardClass(index, currentIndex) {
          const normalizedIndex = (index - currentIndex + totalCards) % totalCards;
          if (normalizedIndex === 0) return "current";
          if (normalizedIndex === 1) return "next";
          if (normalizedIndex === totalCards - 1) return "previous";
          return "hidden-card";
      }

      function updateCards() {
          const cardElements = container.querySelectorAll('.card-item');
          cardElements.forEach((card, index) => {
              card.className = 'card-item ' + getCardClass(index, currentCardIndex);
              // Ensure correct z-index and initial opacity/transform based on class
               const cardClass = getCardClass(index, currentCardIndex);
               card.style.zIndex = totalCards - Math.abs(currentCardIndex - index); // Basic z-index
               if (cardClass === 'current') {
                   card.style.opacity = '1';
                   // Apply current transform based on transition style if needed (e.g., translateZ(0))
                   if (container.classList.contains('transition-flip-down')) card.style.transform = 'rotateX(0deg) translateZ(0)';
                   else if (container.classList.contains('transition-flip-behind')) card.style.transform = 'rotateY(0deg) translateZ(0)';
                   else if (container.classList.contains('transition-slide-fade')) card.style.transform = 'translateX(0%) translateY(0) scale(1)';
                    else if (container.classList.contains('transition-lift-drop')) card.style.transform = 'translateY(0) translateZ(0)';
                    else if (container.classList.contains('transition-flip-dissolve')) card.style.transform = 'rotateY(0deg) scale(1)';

               } else if (cardClass === 'next') {
                   card.style.opacity = '0'; // Keep next initially invisible or use specific transition start state
                   // Apply next transform based on transition style
                   if (container.classList.contains('transition-flip-down')) card.style.transform = 'rotateX(-90deg) translateZ(-20px) translateY(-20px)';
                   else if (container.classList.contains('transition-flip-behind')) card.style.transform = 'rotateY(180deg) translateZ(-50px)';
                    else if (container.classList.contains('transition-slide-fade')) card.style.transform = 'translateX(100%) translateY(-20px) scale(0.9)';
                    else if (container.classList.contains('transition-lift-drop')) card.style.transform = 'translateY(-100%) translateZ(-30px)';
                    else if (container.classList.contains('transition-flip-dissolve')) card.style.transform = 'rotateY(90deg) scale(0.8)';
               } else if (cardClass === 'previous') {
                    card.style.opacity = '0';
                   // Apply previous transform based on transition style
                   if (container.classList.contains('transition-flip-down')) card.style.transform = 'rotateX(90deg) translateZ(-20px) translateY(20px)';
                    else if (container.classList.contains('transition-flip-behind')) card.style.transform = 'rotateY(-180deg) translateZ(-50px)';
                    else if (container.classList.contains('transition-slide-fade')) card.style.transform = 'translateX(-100%) translateY(-20px) scale(0.9)';
                    else if (container.classList.contains('transition-lift-drop')) card.style.transform = 'translateY(100%) translateZ(-30px)';
                    else if (container.classList.contains('transition-flip-dissolve')) card.style.transform = 'rotateY(-90deg) scale(0.8)';
               } else {
                  card.style.opacity = '0'; // Hidden cards
                  card.style.transform = 'scale(0.8)'; // Example hidden state
               }
          });
      }

      container.addEventListener('click', (e) => {
          if (e.target.closest('.card-link-icon')) {
              // Handle link click
              const button = e.target.closest('.card-link-icon');
              const link = button.getAttribute('data-link');
              if (link) {
                   e.stopPropagation(); // Prevent card transition
                   window.open(link, '_blank', 'noopener,noreferrer');
              }
          } else if (e.target.closest('.card-item')) {
              // Handle card tap for transition
              currentCardIndex = (currentCardIndex + 1) % totalCards;
              updateCards();
          }
      });

       // Add event listeners for link icons after initial setup
      container.querySelectorAll('.card-link-icon').forEach(icon => {
          icon.addEventListener('click', (e) => {
               const link = icon.getAttribute('data-link');
               if (link) {
                   e.stopPropagation(); // Prevent card transition
                   window.open(link, '_blank', 'noopener,noreferrer');
               }
          });
       });


      // Initial setup
      updateCards();
    `;

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

     const htmlContent = generateStandaloneHtml(deckItems, transitionStyle);
     const blob = new Blob([htmlContent], { type: 'text/html' });
     const url = URL.createObjectURL(blob);
     const link = document.createElement('a');
     link.href = url;
     link.download = 'decktap-deck.html';
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
     URL.revokeObjectURL(url);

     toast({
        title: "Download Started",
        description: "Your standalone deck HTML file is downloading.",
     });
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
            className={cn(
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
              {isDragging ? "Drop images here" : `Drag & drop ${MAX_IMAGES - deckItems.length} more images or click to upload`}
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
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemoveItem(item.id)}>
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
                <SelectItem value="transition-flip-behind">Flip Behind</SelectItem>
                <SelectItem value="transition-slide-fade">Slide Fade</SelectItem>
                <SelectItem value="transition-lift-drop">Lift Up / Drop Down</SelectItem>
                <SelectItem value="transition-flip-dissolve">Flip + Dissolve</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
         <CardFooter className="flex-col items-start gap-4">
             {/* Share Section */}
             {deckItems.length >= MIN_IMAGES && (
                 <div className="w-full space-y-4 pt-4 border-t border-border">
                    {/* Apply text-primary class for glow effect */}
                    <h3 className="text-lg font-medium font-heading flex items-center gap-2 text-primary"><Share2 className="w-5 h-5 text-primary"/> Share Your Deck</h3>
                    {shareLink && (
                        <div className="space-y-2">
                            <Label htmlFor="share-link">Share Link</Label>
                            <div className="flex gap-2">
                                <Input id="share-link" value={shareLink} readOnly className="bg-muted" />
                                <Button variant="outline" size="icon" onClick={() => copyToClipboard(shareLink, 'Link')}>
                                    <Copy className="h-4 w-4" />
                                    <span className="sr-only">Copy Link</span>
                                </Button>
                            </div>
                        </div>
                    )}
                    {embedCode && (
                        <div className="space-y-2">
                            <Label htmlFor="embed-code">Embed Code</Label>
                            <div className="flex gap-2 items-start">
                                <Textarea id="embed-code" value={embedCode} readOnly rows={3} className="bg-muted text-xs resize-none" />
                                <Button variant="outline" size="icon" onClick={() => copyToClipboard(embedCode, 'Embed Code')} className="mt-px">
                                    <Copy className="h-4 w-4" />
                                    <span className="sr-only">Copy Embed Code</span>
                                </Button>
                            </div>
                        </div>
                    )}
                     {/* Download Button */}
                    <Button onClick={handleDownload} variant="outline" className="w-full">
                        <Download className="mr-2 h-4 w-4" />
                        Download Standalone HTML
                    </Button>
                </div>
            )}
           {deckItems.length < MIN_IMAGES && deckItems.length > 0 && (
                 <p className="text-sm text-muted-foreground">Upload at least {MIN_IMAGES} images to generate share links and download.</p>
            )}
         </CardFooter>
      </Card>

      {/* Right Column: Card Preview */}
      <div className="w-full lg:w-2/3 flex items-center justify-center p-4 lg:p-16">
         {deckItems.length > 0 ? (
             <div className={cn("card-stack-container", transitionStyle)}>
                {deckItems.map((item, index) => (
                <div
                    key={item.id}
                    className={cn("card-item", getCardClassName(index))}
                    onClick={handleCardTap}
                    // style={{ zIndex: deckItems.length - Math.abs(currentCardIndex - index)}} // Basic z-index logic
                    // Let CSS handle z-index based on class for smoother transitions
                    data-ai-hint="card background"
                >
                    <Image
                     src={item.imageUrl}
                     alt={`Card ${index + 1}`}
                     fill // Use fill for better responsiveness within the container
                     style={{ objectFit: 'cover' }} // Ensure image covers the card area
                     priority={index === currentCardIndex} // Prioritize loading the current image
                     unoptimized // Use unoptimized if images are data URIs to avoid Next.js optimization issues
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
            ) : (
             <div className="w-[300px] h-[400px] border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                <p className="text-lg font-medium">Your Deck Appears Here</p>
                <p className="text-sm">Upload {MIN_IMAGES}-{MAX_IMAGES} images to get started.</p>
            </div>
            )}
      </div>
    </div>
  );
}
