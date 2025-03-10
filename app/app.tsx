"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import { Loader } from "@/components/ui/loader";
import Logo from "./components/Logo";
import { signIn, signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export type Product = {
  name: string;
  preview_url: string | null;
  description: string | null;
  customizable_price: boolean;
  require_shipping: boolean;
  custom_receipt: string | null;
  custom_permalink: string | null;
  subscription_duration: string | null;
  id: string;
  url: string | null;
  price: number;
  currency: string;
  short_url: string;
  thumbnail_url: string | null;
  tags: string[];
  formatted_price: string;
  published: boolean;
  file_info: Record<string, any>;
  max_purchase_count: number | null;
  deleted: boolean;
  custom_fields: any[];
  custom_summary: string | null;
  is_tiered_membership: boolean;
  recurrences: string[] | null;
  variants: Variant[];
  purchasing_power_parity_prices: { [country: string]: number };
};

export type Variant = {
  title: string;
  options: Option[];
};

export type Option = {
  name: string;
  price_difference: number;
  is_pay_what_you_want: boolean;
  recurrence_prices: RecurrencePrices | null;
  url: string | null;
};

export type RecurrencePrices = {
  [recurrence: string]: {
    price_cents: number;
    suggested_price_cents: number | null;
  };
};

export default function App({ isAuthenticated, products }: { isAuthenticated: boolean; products: Product[] }) {
  const [about, setAbout] = useState(() => {
    // Check if running in browser environment
    if (typeof window !== "undefined") {
      const savedAbout = localStorage.getItem("gumNewAbout");
      return savedAbout || "";
    }
    return "";
  });
  const [status, setStatus] = useState<"initial" | "generating" | "finished">("initial");
  const searchParams = useSearchParams();
  const productIdParam = searchParams.get("productId");
  // Check if the productId from the query parameter exists in the products array
  const productExists = productIdParam && products?.some((product) => product.id === productIdParam);
  const [selectedProduct, setSelectedProduct] = useState(productExists ? productIdParam : products?.[0]?.id || "");
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [newProductDetails, setNewProductDetails] = useState("");
  const [textareaFontSizeClass, setTextareaFontSizeClass] = useState(() => {
    // Set initial font size based on text length from localStorage
    if (typeof window !== "undefined") {
      const savedAbout = localStorage.getItem("gumNewAbout") || "";
      if (savedAbout.length > 200) {
        return "text-xl sm:text-2xl md:text-3xl lg:text-4xl";
      } else if (savedAbout.length > 100) {
        return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl";
      }
    }
    return "text-3xl sm:text-4xl md:text-5xl lg:text-6xl";
  });
  const defaultText = "a landing page";
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showLoginOverlay, setShowLoginOverlay] = useState(false);

  useEffect(() => {
    // Save about value to localStorage whenever it changes
    if (about) {
      localStorage.setItem("gumNewAbout", about);
    }
  }, [about]);

  useEffect(() => {
    // Skip the typing animation if we've restored text from localStorage
    if (about) return;

    let index = 0;
    let typeInterval: NodeJS.Timeout;

    const type = () => {
      if (index < defaultText.length) {
        setAbout(defaultText.slice(0, index + 1));
        // Update font size class based on the current text length
        const currentTextLength = defaultText.slice(0, index + 1).length;
        if (currentTextLength > 200) {
          setTextareaFontSizeClass("text-xl sm:text-2xl md:text-3xl lg:text-4xl");
        } else if (currentTextLength > 100) {
          setTextareaFontSizeClass("text-2xl sm:text-3xl md:text-4xl lg:text-5xl");
        } else {
          setTextareaFontSizeClass("text-3xl sm:text-4xl md:text-5xl lg:text-6xl");
        }
        index++;
        typeInterval = setTimeout(type, Math.random() * 20 + 20);
      } else {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(defaultText.length, defaultText.length);
        }
      }
    };

    typeInterval = setTimeout(type, Math.random() * 100 + 30);

    return () => clearTimeout(typeInterval);
  }, []);

  // Auto-resize textarea on initial render when loading from localStorage
  useEffect(() => {
    if (about && inputRef.current) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.style.height = "auto";
          inputRef.current.style.height = `${inputRef.current.scrollHeight + 8}px`;
        }
      }, 0);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If not authenticated, show login overlay instead of submitting
    if (!isAuthenticated) {
      setShowLoginOverlay(true);
      return;
    }

    const messages = [
      {
        content: `Make ${about}`,
        productInfo: JSON.stringify(
          isNewProduct ? newProductDetails : (products?.find((p) => p.id === selectedProduct) ?? ""),
        ),
      },
    ];

    setStatus("generating");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages,
        }),
      });

      const { id } = await response.json();
      setStatus("finished");

      // Clear localStorage after successful submission
      localStorage.removeItem("gumNewAbout");

      setTimeout(() => {
        window.location.href = `/gum/${id}`;
      }, 1000);
    } catch (error) {
      console.error("Error generating content:", error);
      setStatus("initial");
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setAbout(suggestion);

    // Adjust font size based on suggestion text length
    if (suggestion.length > 200) {
      setTextareaFontSizeClass("text-xl sm:text-2xl md:text-3xl lg:text-4xl");
    } else if (suggestion.length > 100) {
      setTextareaFontSizeClass("text-2xl sm:text-3xl md:text-4xl lg:text-5xl");
    } else {
      setTextareaFontSizeClass("text-3xl sm:text-4xl md:text-5xl lg:text-6xl");
    }

    if (inputRef.current) {
      inputRef.current.focus();

      // Auto resize the textarea after setting new content
      setTimeout(() => {
        if (inputRef.current) {
          // Store the current scroll position
          const scrollTop = inputRef.current.scrollTop;
          inputRef.current.style.height = "auto";
          inputRef.current.style.height = `${inputRef.current.scrollHeight + 8}px`; // Added padding
          // Restore the scroll position
          inputRef.current.scrollTop = scrollTop;
        }
      }, 0);
    }
  };

  // Function to handle textarea input changes and auto-resize
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setAbout(text);

    // Adjust font size based on text length
    if (text.length > 200) {
      setTextareaFontSizeClass("text-xl sm:text-2xl md:text-3xl lg:text-4xl");
    } else if (text.length > 100) {
      setTextareaFontSizeClass("text-2xl sm:text-3xl md:text-4xl lg:text-5xl");
    } else {
      setTextareaFontSizeClass("text-3xl sm:text-4xl md:text-5xl lg:text-6xl");
    }

    // Store the current scroll position
    const scrollTop = e.target.scrollTop;
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight + 8}px`; // Added padding
    // Restore the scroll position
    e.target.scrollTop = scrollTop;
  };

  return (
    <div className="relative">
      <div className="flex min-h-screen items-center justify-center overflow-y-auto bg-[#f4f4f0] dark:bg-black dark:text-white">
        <div className="absolute top-4 left-4">
          <Logo useTailwind={false} />
        </div>

        {isAuthenticated && (
          <div className="absolute top-4 right-4">
            <Button
              onClick={() => signOut()}
              variant="outline"
              className="rounded-full border-2 border-black bg-white px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-black hover:text-white dark:border-white dark:bg-black dark:text-white dark:hover:bg-white dark:hover:text-black"
            >
              Logout
            </Button>
          </div>
        )}

        {status !== "initial" ? <Loader isDoneLoading={status === "finished"} /> : null}
        <form
          onSubmit={handleSubmit}
          className="font-['Helvetica Neue',Helvetica,Arial,sans-serif] absolute top-1/2 left-1/2 z-10 w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 px-4 text-3xl leading-2 font-bold text-black sm:w-[calc(100%-4rem)] sm:text-4xl md:max-w-[61%] md:text-5xl lg:text-6xl dark:text-white"
          style={{ lineHeight: "150%" }}
        >
          {isAuthenticated && (!products || products.length === 0) && (
            <div className="mb-8 rounded-[20px] border-4 border-black bg-[rgba(255,201,0,0.3)] p-4 text-xl font-normal sm:p-6 sm:text-2xl md:text-3xl lg:text-4xl dark:border-white">
              <p className="mb-2 font-bold">⚠️ You need Gumroad products to create a landing page</p>
              <p>
                Please create a product on Gumroad first or wait until we support creating products directly from
                gum.new.
              </p>
            </div>
          )}
          I want to make
          <textarea
            ref={inputRef}
            name="about"
            placeholder="..."
            className={`resize-vertical mt-2 block w-full rounded-[20px] border-4 border-black px-4 py-4 ${textareaFontSizeClass} dark:border-white dark:text-black`}
            value={about}
            style={{
              backgroundColor: "rgba(255, 144, 232)",
              minHeight: "150px",
              paddingTop: "18px",
              paddingBottom: "18px",
            }}
            onChange={handleTextareaChange}
          />
          <div className="mt-4 flex flex-wrap gap-2 text-base sm:text-lg md:text-xl">
            {[
              { text: "a neobrutalist gumroad-esque landing page", icon: "🏗️" },
              { text: "a looooooong sales letter with a focus on conversion optimization", icon: "📝" },
              { text: "a valentines day themed landing page", icon: "❤️" },
              { text: "a minimalist / new york-based design agency vibe, all black and white", icon: "🌓" },
              { text: "a retro 90s inspired showcase", icon: "🕹️" },
              { text: "a limited-time offer page with countdown timer that expires on march 1st 2025", icon: "⏱️" },
              { text: "an landing page with a focus on an art gallery at the top", icon: "🎨" },
              { text: "a membership site with tiered pricing cards", icon: "💳" },
            ].map((suggestion) => (
              <a
                key={suggestion.text}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleSuggestionClick(suggestion.text);
                }}
                className="rounded-full border-2 border-black bg-white px-3 py-1 text-black transition-transform hover:scale-105 hover:cursor-pointer dark:bg-black dark:text-white"
              >
                {suggestion.icon} {suggestion.text}
              </a>
            ))}
          </div>
          {isAuthenticated && products && products.length > 0 && (
            <>
              <div className="mt-8 text-6xl">to sell</div>
              <div className="relative">
                {!isNewProduct ? (
                  <>
                    <select
                      name="product"
                      value={selectedProduct}
                      onChange={(e) => {
                        if (e.target.value === "new") {
                          setIsNewProduct(true);
                        } else {
                          setSelectedProduct(e.target.value);
                        }
                      }}
                      className={`mt-4 block w-full appearance-none rounded-[20px] border-4 border-black px-4 py-4 ${textareaFontSizeClass} dark:border-white dark:text-black`}
                      style={{
                        backgroundColor: "rgba(255, 201, 0)",
                      }}
                    >
                      {products.map((product: Product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-8">
                      <svg className="h-12 w-12 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </div>
                  </>
                ) : (
                  <input
                    type="text"
                    name="newProduct"
                    value={newProductDetails}
                    onChange={(e) => setNewProductDetails(e.target.value)}
                    placeholder="a $50 course with 10 seats on developing with devin"
                    className={`mt-4 block w-full appearance-none rounded-[20px] border-4 border-black px-6 py-6 ${textareaFontSizeClass} dark:border-white dark:text-black`}
                    style={{
                      backgroundColor: "rgba(255, 201, 0)",
                    }}
                    autoFocus
                  />
                )}
              </div>
            </>
          )}
          <Button
            type="submit"
            variant="outline"
            className="mt-8 w-full cursor-pointer rounded-full border-4 border-black bg-black p-4 text-2xl font-bold text-white transition-colors hover:bg-white hover:text-black sm:p-6 sm:text-3xl md:p-8 md:text-4xl lg:text-5xl dark:border-white dark:bg-black dark:text-white dark:hover:bg-white dark:hover:text-black"
            disabled={status !== "initial" || (isAuthenticated && (!products || products.length === 0))}
          >
            {status === "generating" ? "Creating..." : "Create"}
          </Button>
        </form>
      </div>

      <AnimatePresence>
        {showLoginOverlay && !isAuthenticated && (
          <motion.div
            className="absolute inset-0 z-10 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="absolute inset-0 bg-[rgba(255,144,232,0.8)] backdrop-blur-sm"
              onClick={() => setShowLoginOverlay(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{
                type: "spring",
                damping: 20,
                stiffness: 300,
                delay: 0.1,
              }}
            >
              <Button
                onClick={() => signIn("gumroad")}
                className="relative z-10 cursor-pointer rounded-full border-4 border-black bg-white p-4 text-2xl font-bold text-black transition-colors hover:bg-black hover:text-white sm:p-6 sm:text-3xl md:p-8 md:text-4xl lg:text-5xl dark:border-white"
              >
                Login with Gumroad
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
