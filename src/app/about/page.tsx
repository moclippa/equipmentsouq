import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Search, Phone, Handshake, Shield, Clock, Users } from "lucide-react";

export default function AboutPage() {
  const steps = [
    {
      icon: Search,
      title: "Browse Equipment",
      description: "Search our marketplace for excavators, cranes, loaders, and more across Saudi Arabia and Bahrain.",
    },
    {
      icon: Phone,
      title: "Contact Owner",
      description: "Found what you need? Click contact to get the owner's phone number and WhatsApp.",
    },
    {
      icon: Handshake,
      title: "Negotiate Directly",
      description: "Discuss rental terms, pricing, and delivery directly with the equipment owner.",
    },
  ];

  const features = [
    {
      icon: Shield,
      title: "Verified Listings",
      description: "All business profiles are verified with CR and VAT documentation.",
    },
    {
      icon: Clock,
      title: "Quick Connections",
      description: "Get owner contact details instantly - no waiting for approval.",
    },
    {
      icon: Users,
      title: "Direct Deals",
      description: "Negotiate directly with owners for the best rates and terms.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">E</span>
            </div>
            <span className="font-semibold text-lg">Equipment Souq</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 me-2" />
              Back
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">How Equipment Souq Works</h1>
            <p className="text-xl text-muted-foreground">
              The easiest way to rent heavy equipment in Saudi Arabia and Bahrain
            </p>
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {steps.map((step, index) => (
              <Card key={step.title} className="relative">
                <CardContent className="p-6 text-center">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <step.icon className="w-12 h-12 mx-auto mt-4 mb-4 text-primary" />
                  <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* About Section */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-4">About Equipment Souq</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-muted-foreground mb-4">
                Equipment Souq is the leading marketplace for heavy equipment rental in Saudi Arabia and Bahrain.
                We connect contractors, construction companies, and industrial businesses with equipment owners
                who have excavators, cranes, loaders, and other machinery available for rent.
              </p>
              <p className="text-muted-foreground mb-4">
                Our platform makes it easy to find the equipment you need, contact owners directly, and
                negotiate rental terms that work for both parties. No middlemen, no hidden fees - just
                direct connections between renters and owners.
              </p>
              <p className="text-muted-foreground">
                Whether you're looking to rent equipment for a day or a year, Equipment Souq has you covered
                with listings across the Gulf region.
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-6 text-center">Why Choose Equipment Souq</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {features.map((feature) => (
                <div key={feature.title} className="text-center">
                  <feature.icon className="w-10 h-10 mx-auto mb-3 text-primary" />
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center bg-muted rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-6">
              Browse available equipment or list your own machinery today.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/search">
                <Button size="lg">Browse Equipment</Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" size="lg">List Your Equipment</Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
