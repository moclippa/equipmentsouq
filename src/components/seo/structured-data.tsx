import Script from "next/script";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://equipmentsouq.com";

// Organization schema for the website
export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "EquipmentSouq",
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description:
      "The Gulf's largest classifieds platform for heavy equipment rental and sale in Saudi Arabia and Bahrain.",
    address: {
      "@type": "PostalAddress",
      addressCountry: ["SA", "BH"],
    },
    areaServed: [
      {
        "@type": "Country",
        name: "Saudi Arabia",
      },
      {
        "@type": "Country",
        name: "Bahrain",
      },
    ],
    sameAs: [],
  };

  return (
    <Script
      id="organization-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Website schema with search action
export function WebsiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "EquipmentSouq",
    url: BASE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <Script
      id="website-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Equipment listing schema (for individual equipment pages)
interface EquipmentSchemaProps {
  equipment: {
    id: string;
    titleEn: string;
    descriptionEn: string;
    make: string;
    model: string;
    year?: number | null;
    condition: string;
    rentalPrice?: number | null;
    salePrice?: number | null;
    currency: string;
    locationCity: string;
    locationCountry: string;
    images: { url: string }[];
    category: { nameEn: string };
    owner: { fullName: string };
    createdAt: Date;
  };
}

export function EquipmentSchema({ equipment }: EquipmentSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: equipment.titleEn,
    description: equipment.descriptionEn,
    brand: {
      "@type": "Brand",
      name: equipment.make,
    },
    model: equipment.model,
    productionDate: equipment.year ? `${equipment.year}` : undefined,
    category: equipment.category.nameEn,
    image: equipment.images.map((img) => img.url),
    offers: {
      "@type": "Offer",
      priceCurrency: equipment.currency,
      price: equipment.salePrice || equipment.rentalPrice || undefined,
      availability: "https://schema.org/InStock",
      itemCondition:
        equipment.condition === "EXCELLENT"
          ? "https://schema.org/NewCondition"
          : "https://schema.org/UsedCondition",
      seller: {
        "@type": "Person",
        name: equipment.owner.fullName,
      },
      areaServed: {
        "@type": "City",
        name: equipment.locationCity,
        containedInPlace: {
          "@type": "Country",
          name: equipment.locationCountry === "SA" ? "Saudi Arabia" : "Bahrain",
        },
      },
    },
    url: `${BASE_URL}/equipment/${equipment.id}`,
  };

  return (
    <Script
      id="equipment-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Breadcrumb schema
interface BreadcrumbSchemaProps {
  items: { name: string; url: string }[];
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${BASE_URL}${item.url}`,
    })),
  };

  return (
    <Script
      id="breadcrumb-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// FAQ schema (for how-it-works page)
interface FAQSchemaProps {
  faqs: { question: string; answer: string }[];
}

export function FAQSchema({ faqs }: FAQSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <Script
      id="faq-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Local Business schema
export function LocalBusinessSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": BASE_URL,
    name: "EquipmentSouq",
    description:
      "Heavy equipment rental and sale classifieds platform for Saudi Arabia and Bahrain.",
    url: BASE_URL,
    priceRange: "$$",
    areaServed: [
      {
        "@type": "Country",
        name: "Saudi Arabia",
      },
      {
        "@type": "Country",
        name: "Bahrain",
      },
    ],
    serviceType: ["Equipment Rental", "Equipment Sale", "Classifieds"],
  };

  return (
    <Script
      id="local-business-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
