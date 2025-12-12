import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Phone, Star, ArrowRight } from "lucide-react";

const benefits = [
  "Free unlimited listings",
  "AI-powered listing creation",
  "SMS notifications for new leads",
  "Direct contact - no middleman",
];

const features = [
  {
    icon: Clock,
    title: "List in 2 Minutes",
    description: "AI helps write your listing",
    color: "bg-green-100 text-green-600",
  },
  {
    icon: Phone,
    title: "Get Notified",
    description: "SMS alerts for every inquiry",
    color: "bg-blue-100 text-blue-600",
  },
  {
    icon: Star,
    title: "Build Reputation",
    description: "Verified badge for trusted owners",
    color: "bg-purple-100 text-purple-600",
  },
];

export function ForOwnersSection() {
  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
          <div>
            <Badge variant="outline" className="mb-4">For Equipment Owners</Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              List Your Equipment for Free
            </h2>
            <p className="text-muted-foreground mb-6">
              Reach thousands of contractors looking to rent or buy equipment.
              No listing fees, no commissions - just direct business.
            </p>

            <ul className="space-y-3 mb-8">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            <Link href="/register">
              <Button size="lg" className="gap-2">
                Start Listing Free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="bg-muted/50 rounded-2xl p-8 border">
            <div className="space-y-4">
              {features.map((feature) => (
                <div key={feature.title} className="flex items-center gap-4 p-4 bg-background rounded-lg">
                  <div className={`w-10 h-10 ${feature.color} rounded-full flex items-center justify-center`}>
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">{feature.title}</div>
                    <div className="text-sm text-muted-foreground">{feature.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
