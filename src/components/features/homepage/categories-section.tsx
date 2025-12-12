import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Construction,
  ArrowUpFromLine,
  Package,
  Cog,
  MoveVertical,
  Zap,
  Truck,
  ArrowRight,
} from "lucide-react";

const categories = [
  { name: "Excavators", icon: Construction, color: "bg-amber-100 text-amber-600", slug: "excavators" },
  { name: "Cranes", icon: ArrowUpFromLine, color: "bg-blue-100 text-blue-600", slug: "cranes" },
  { name: "Loaders", icon: Package, color: "bg-green-100 text-green-600", slug: "loaders" },
  { name: "Bulldozers", icon: Cog, color: "bg-orange-100 text-orange-600", slug: "bulldozers" },
  { name: "Forklifts", icon: MoveVertical, color: "bg-purple-100 text-purple-600", slug: "forklifts" },
  { name: "Generators", icon: Zap, color: "bg-yellow-100 text-yellow-600", slug: "generators" },
  { name: "Dump Trucks", icon: Truck, color: "bg-red-100 text-red-600", slug: "dump-trucks" },
];

export function CategoriesSection() {
  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Browse by Category
          </h2>
          <p className="text-muted-foreground">
            Find the right equipment for your project
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {categories.map((category) => (
            <Link
              key={category.name}
              href={`/search?category=${category.slug}`}
              className="flex flex-col items-center p-6 bg-background rounded-xl border hover:border-primary hover:shadow-md transition-all group"
            >
              <div className={`w-14 h-14 ${category.color} rounded-full mb-3 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <category.icon className="w-7 h-7" />
              </div>
              <span className="text-sm font-medium text-center">
                {category.name}
              </span>
            </Link>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link href="/search">
            <Button variant="outline" className="gap-2">
              View All Categories
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
