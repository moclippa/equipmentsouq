import { Search, Phone, MessageCircle } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "1. Search & Find",
    description: "Browse hundreds of equipment listings. Filter by category, location, and price to find what you need.",
  },
  {
    icon: Phone,
    title: "2. Contact Owner",
    description: "Click \"Contact Owner\" to get their phone number and WhatsApp. Reach out directly to discuss details.",
  },
  {
    icon: MessageCircle,
    title: "3. Negotiate & Deal",
    description: "Discuss pricing, availability, and delivery directly with the owner. Make your deal on your terms.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            How EquipmentSouq Works
          </h2>
          <p className="text-muted-foreground">
            Simple, direct, no middleman fees
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.title} className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <step.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
