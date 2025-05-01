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
import { UploadCloud, Link as LinkIcon, Copy, Share2, X } from "lucide-react";
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


  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 items-start">
      {/* Left Column: Controls */}
      <Card className="w-full lg:w-1/3">
        <CardHeader>
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
          {(shareLink || embedCode) && (
            <div className="w-full space-y-4 pt-4 border-t border-border">
                <h3 className="text-lg font-medium font-heading flex items-center gap-2"><Share2 className="w-5 h-5 text-primary"/> Share Your Deck</h3>
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
            </div>
          )}
           {deckItems.length < MIN_IMAGES && deckItems.length > 0 && (
                 <p className="text-sm text-muted-foreground">Upload at least {MIN_IMAGES} images to generate share links.</p>
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
                    style={{ zIndex: deckItems.length - Math.abs(currentCardIndex - index)}} // Basic z-index logic
                    data-ai-hint="card background"
                >
                    <Image
                     src={item.imageUrl}
                     alt={`Card ${index + 1}`}
                     fill // Use fill for better responsiveness within the container
                     style={{ objectFit: 'cover' }} // Ensure image covers the card area
                     priority={index === currentCardIndex} // Prioritize loading the current image
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
