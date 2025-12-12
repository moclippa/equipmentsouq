import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative py-20 md:py-28 px-4 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />

      <div className="container mx-auto relative">
        <div className="text-center max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-4">
            Saudi Arabia & Bahrain
          </Badge>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Find & Rent Heavy Equipment{" "}
            <span className="text-primary">Directly from Owners</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            The largest classifieds platform for construction equipment in the Gulf.
            Browse listings, contact owners directly, and negotiate your best deal.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <Link href="/search">
              <div className="flex items-center gap-3 p-4 bg-background border rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                <Search className="w-5 h-5 text-muted-foreground" />
                <span className="text-muted-foreground flex-1 text-start">
                  Search for excavators, cranes, loaders...
                </span>
                <Button size="sm">
                  Search
                </Button>
              </div>
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/search">
              <Button size="lg" className="w-full sm:w-auto gap-2">
                Browse Equipment
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                List Your Equipment Free
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
