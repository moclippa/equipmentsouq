import { CheckCircle2, Shield, Phone, MessageCircle } from "lucide-react";

export function TrustIndicators() {
  const indicators = [
    { icon: CheckCircle2, label: "Free to List", color: "text-green-600" },
    { icon: Shield, label: "Verified Owners", color: "text-blue-600" },
    { icon: Phone, label: "Direct Contact", color: "text-purple-600" },
    { icon: MessageCircle, label: "WhatsApp Support", color: "text-green-600" },
  ];

  return (
    <section className="py-8 px-4 border-y bg-muted/30">
      <div className="container mx-auto">
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
          {indicators.map((indicator) => (
            <div key={indicator.label} className="flex items-center gap-2">
              <indicator.icon className={`w-5 h-5 ${indicator.color}`} />
              <span className="text-sm font-medium">{indicator.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
