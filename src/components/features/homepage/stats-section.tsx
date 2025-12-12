import { CachedStats } from "@/lib/cache";

interface StatsSectionProps {
  stats: CachedStats;
}

export function StatsSection({ stats }: StatsSectionProps) {
  const displayStats = [
    { value: stats.equipment > 0 ? stats.equipment : "500", label: "Equipment Listed", suffix: "+" },
    { value: stats.owners > 0 ? stats.owners : "200", label: "Verified Owners", suffix: "+" },
    { value: stats.leads > 0 ? stats.leads : "1000", label: "Connections Made", suffix: "+" },
  ];

  return (
    <section className="py-16 px-4 bg-primary text-primary-foreground">
      <div className="container mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            The Gulf&apos;s Largest Equipment Marketplace
          </h2>
          <p className="opacity-90">
            Trusted by contractors across Saudi Arabia and Bahrain
          </p>
        </div>

        <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
          {displayStats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-4xl md:text-5xl font-bold mb-2">
                {stat.value}{stat.suffix}
              </div>
              <div className="text-sm opacity-90">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
