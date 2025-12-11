import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Load environment variables from .env file
config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Equipment Categories for Heavy Equipment Rental/Sale
// Comprehensive categories for Saudi Arabia and Bahrain market
const categories = [
  // Main Categories
  {
    slug: "earthmoving",
    nameEn: "Earthmoving",
    nameAr: "معدات الحفر والردم",
    descriptionEn: "Heavy equipment for excavation, digging, and earth-moving operations",
    descriptionAr: "معدات ثقيلة للحفر والتنقيب وعمليات نقل التربة",
    sortOrder: 1,
    attributeSchema: {
      required: ["operatingWeight"],
      fields: [
        { key: "operatingWeight", label: "Operating Weight", labelAr: "الوزن التشغيلي", type: "number", unit: "kg" },
        { key: "bucketCapacity", label: "Bucket Capacity", labelAr: "سعة الدلو", type: "number", unit: "m³" },
        { key: "digDepth", label: "Max Dig Depth", labelAr: "أقصى عمق حفر", type: "number", unit: "m" },
        { key: "reach", label: "Max Reach", labelAr: "أقصى مدى", type: "number", unit: "m" },
        { key: "enginePower", label: "Engine Power", labelAr: "قوة المحرك", type: "number", unit: "hp" },
      ],
    },
    children: [
      { slug: "excavators", nameEn: "Excavators", nameAr: "حفارات", sortOrder: 1 },
      { slug: "mini-excavators", nameEn: "Mini Excavators", nameAr: "حفارات صغيرة", sortOrder: 2 },
      { slug: "backhoe-loaders", nameEn: "Backhoe Loaders", nameAr: "لوادر خلفية", sortOrder: 3 },
      { slug: "wheel-loaders", nameEn: "Wheel Loaders", nameAr: "لوادر عجلية", sortOrder: 4 },
      { slug: "skid-steers", nameEn: "Skid Steers", nameAr: "لوادر انزلاقية", sortOrder: 5 },
      { slug: "compact-track-loaders", nameEn: "Compact Track Loaders", nameAr: "لوادر مجنزرة صغيرة", sortOrder: 6 },
      { slug: "bulldozers", nameEn: "Bulldozers", nameAr: "بلدوزرات", sortOrder: 7 },
      { slug: "motor-graders", nameEn: "Motor Graders", nameAr: "ماكينات تسوية", sortOrder: 8 },
      { slug: "scrapers", nameEn: "Scrapers", nameAr: "كاشطات", sortOrder: 9 },
      { slug: "trenchers", nameEn: "Trenchers", nameAr: "حفارات خنادق", sortOrder: 10 },
    ],
  },
  {
    slug: "lifting",
    nameEn: "Lifting & Material Handling",
    nameAr: "معدات الرفع والمناولة",
    descriptionEn: "Cranes, forklifts, and aerial work platforms for lifting and moving materials",
    descriptionAr: "رافعات ورافعات شوكية ومنصات عمل هوائية لرفع ونقل المواد",
    sortOrder: 2,
    attributeSchema: {
      required: ["maxLiftCapacity", "maxLiftHeight"],
      fields: [
        { key: "maxLiftCapacity", label: "Max Lift Capacity", labelAr: "أقصى حمولة رفع", type: "number", unit: "tons" },
        { key: "maxLiftHeight", label: "Max Lift Height", labelAr: "أقصى ارتفاع رفع", type: "number", unit: "m" },
        { key: "boomLength", label: "Boom Length", labelAr: "طول الذراع", type: "number", unit: "m" },
        { key: "platformCapacity", label: "Platform Capacity", labelAr: "سعة المنصة", type: "number", unit: "kg" },
      ],
    },
    children: [
      { slug: "mobile-cranes", nameEn: "Mobile Cranes", nameAr: "رافعات متحركة", sortOrder: 1 },
      { slug: "tower-cranes", nameEn: "Tower Cranes", nameAr: "رافعات برجية", sortOrder: 2 },
      { slug: "crawler-cranes", nameEn: "Crawler Cranes", nameAr: "رافعات زاحفة", sortOrder: 3 },
      { slug: "telehandlers", nameEn: "Telehandlers", nameAr: "مناولات تلسكوبية", sortOrder: 4 },
      { slug: "forklifts", nameEn: "Forklifts", nameAr: "رافعات شوكية", sortOrder: 5 },
      { slug: "scissor-lifts", nameEn: "Scissor Lifts", nameAr: "مقصات رفع", sortOrder: 6 },
      { slug: "boom-lifts", nameEn: "Boom Lifts", nameAr: "رافعات ذراعية", sortOrder: 7 },
    ],
  },
  {
    slug: "concrete",
    nameEn: "Concrete & Compaction",
    nameAr: "الخرسانة والدك",
    descriptionEn: "Equipment for concrete work, paving, and soil compaction",
    descriptionAr: "معدات لأعمال الخرسانة والرصف ودك التربة",
    sortOrder: 3,
    attributeSchema: {
      required: [],
      fields: [
        { key: "drumCapacity", label: "Drum Capacity", labelAr: "سعة الأسطوانة", type: "number", unit: "m³" },
        { key: "compactionForce", label: "Compaction Force", labelAr: "قوة الدك", type: "number", unit: "kN" },
        { key: "workingWidth", label: "Working Width", labelAr: "عرض العمل", type: "number", unit: "m" },
        { key: "pourRate", label: "Pour Rate", labelAr: "معدل الصب", type: "number", unit: "m³/hr" },
      ],
    },
    children: [
      { slug: "concrete-mixers", nameEn: "Concrete Mixers", nameAr: "خلاطات خرسانة", sortOrder: 1 },
      { slug: "concrete-pumps", nameEn: "Concrete Pumps", nameAr: "مضخات خرسانة", sortOrder: 2 },
      { slug: "vibrating-rollers", nameEn: "Vibrating Rollers", nameAr: "دحالات اهتزازية", sortOrder: 3 },
      { slug: "plate-compactors", nameEn: "Plate Compactors", nameAr: "دكاكات صفائحية", sortOrder: 4 },
      { slug: "asphalt-pavers", nameEn: "Asphalt Pavers", nameAr: "فارشات أسفلت", sortOrder: 5 },
      { slug: "road-rollers", nameEn: "Road Rollers", nameAr: "دحالات طرق", sortOrder: 6 },
    ],
  },
  {
    slug: "power",
    nameEn: "Power Generation",
    nameAr: "توليد الطاقة",
    descriptionEn: "Generators, compressors, and power equipment for construction sites",
    descriptionAr: "مولدات وضواغط ومعدات طاقة لمواقع البناء",
    sortOrder: 4,
    attributeSchema: {
      required: ["powerOutput"],
      fields: [
        { key: "powerOutput", label: "Power Output", labelAr: "القدرة الناتجة", type: "number", unit: "kVA" },
        { key: "fuelType", label: "Fuel Type", labelAr: "نوع الوقود", type: "select", options: ["Diesel", "Gas", "Electric"] },
        { key: "airFlow", label: "Air Flow", labelAr: "تدفق الهواء", type: "number", unit: "CFM" },
        { key: "pressure", label: "Working Pressure", labelAr: "ضغط العمل", type: "number", unit: "bar" },
      ],
    },
    children: [
      { slug: "diesel-generators", nameEn: "Diesel Generators", nameAr: "مولدات ديزل", sortOrder: 1 },
      { slug: "air-compressors", nameEn: "Air Compressors", nameAr: "ضواغط هواء", sortOrder: 2 },
      { slug: "welding-machines", nameEn: "Welding Machines", nameAr: "ماكينات لحام", sortOrder: 3 },
      { slug: "light-towers", nameEn: "Light Towers", nameAr: "أبراج إضاءة", sortOrder: 4 },
    ],
  },
  {
    slug: "pumps",
    nameEn: "Pumps & Dewatering",
    nameAr: "المضخات وتصريف المياه",
    descriptionEn: "Water pumps and dewatering equipment for construction sites",
    descriptionAr: "مضخات مياه ومعدات تصريف لمواقع البناء",
    sortOrder: 5,
    attributeSchema: {
      required: ["flowRate"],
      fields: [
        { key: "flowRate", label: "Flow Rate", labelAr: "معدل التدفق", type: "number", unit: "m³/hr" },
        { key: "maxHead", label: "Max Head", labelAr: "أقصى ارتفاع", type: "number", unit: "m" },
        { key: "inletSize", label: "Inlet Size", labelAr: "حجم المدخل", type: "number", unit: "inch" },
        { key: "pumpType", label: "Pump Type", labelAr: "نوع المضخة", type: "select", options: ["Submersible", "Centrifugal", "Trash", "Diaphragm"] },
      ],
    },
    children: [
      { slug: "submersible-pumps", nameEn: "Submersible Pumps", nameAr: "مضخات غاطسة", sortOrder: 1 },
      { slug: "centrifugal-pumps", nameEn: "Centrifugal Pumps", nameAr: "مضخات طرد مركزي", sortOrder: 2 },
      { slug: "trash-pumps", nameEn: "Trash Pumps", nameAr: "مضخات نفايات", sortOrder: 3 },
      { slug: "vacuum-trucks", nameEn: "Vacuum Trucks", nameAr: "شاحنات شفط", sortOrder: 4 },
    ],
  },
  {
    slug: "transport",
    nameEn: "Transport & Hauling",
    nameAr: "النقل والسحب",
    descriptionEn: "Trucks, trailers, and transport equipment for moving materials and equipment",
    descriptionAr: "شاحنات ومقطورات ومعدات نقل لنقل المواد والمعدات",
    sortOrder: 6,
    attributeSchema: {
      required: ["payloadCapacity"],
      fields: [
        { key: "payloadCapacity", label: "Payload Capacity", labelAr: "سعة الحمولة", type: "number", unit: "tons" },
        { key: "bedLength", label: "Bed Length", labelAr: "طول السرير", type: "number", unit: "m" },
        { key: "axles", label: "Number of Axles", labelAr: "عدد المحاور", type: "number", unit: "" },
        { key: "tankCapacity", label: "Tank Capacity", labelAr: "سعة الخزان", type: "number", unit: "liters" },
        { key: "trailerType", label: "Trailer Type", labelAr: "نوع المقطورة", type: "select", options: ["Flatbed", "Lowbed", "Dump", "Tanker", "Curtain Side", "Refrigerated"] },
      ],
    },
    children: [
      { slug: "dump-trucks", nameEn: "Dump Trucks", nameAr: "شاحنات قلابة", sortOrder: 1 },
      { slug: "articulated-dump-trucks", nameEn: "Articulated Dump Trucks", nameAr: "شاحنات قلابة مفصلية", sortOrder: 2 },
      { slug: "tractor-units", nameEn: "Tractor Units / Prime Movers", nameAr: "رؤوس قاطرة", sortOrder: 3 },
      { slug: "flatbed-trailers", nameEn: "Flatbed Trailers", nameAr: "مقطورات مسطحة", sortOrder: 4 },
      { slug: "lowbed-trailers", nameEn: "Lowbed Trailers", nameAr: "مقطورات منخفضة", sortOrder: 5 },
      { slug: "semi-trailers", nameEn: "Semi-Trailers", nameAr: "نصف مقطورات", sortOrder: 6 },
      { slug: "water-tankers", nameEn: "Water Tankers", nameAr: "صهاريج مياه", sortOrder: 7 },
      { slug: "fuel-tankers", nameEn: "Fuel Tankers", nameAr: "صهاريج وقود", sortOrder: 8 },
      { slug: "concrete-mixer-trucks", nameEn: "Concrete Mixer Trucks", nameAr: "شاحنات خلط الخرسانة", sortOrder: 9 },
      { slug: "crane-trucks", nameEn: "Crane Trucks / Boom Trucks", nameAr: "شاحنات رافعة", sortOrder: 10 },
      { slug: "side-loaders", nameEn: "Side Loaders", nameAr: "رافعات جانبية", sortOrder: 11 },
      { slug: "recovery-trucks", nameEn: "Recovery / Tow Trucks", nameAr: "شاحنات سحب", sortOrder: 12 },
    ],
  },
  {
    slug: "light-equipment",
    nameEn: "Light Equipment",
    nameAr: "المعدات الخفيفة",
    descriptionEn: "Smaller equipment and tools for various construction tasks",
    descriptionAr: "معدات وأدوات أصغر لمختلف مهام البناء",
    sortOrder: 7,
    attributeSchema: {
      required: [],
      fields: [
        { key: "weight", label: "Weight", labelAr: "الوزن", type: "number", unit: "kg" },
        { key: "powerSource", label: "Power Source", labelAr: "مصدر الطاقة", type: "select", options: ["Electric", "Petrol", "Diesel", "Battery"] },
      ],
    },
    children: [
      { slug: "mini-dumpers", nameEn: "Mini Dumpers", nameAr: "قلابات صغيرة", sortOrder: 1 },
      { slug: "concrete-cutters", nameEn: "Concrete Cutters", nameAr: "قطاعات خرسانة", sortOrder: 2 },
      { slug: "handheld-breakers", nameEn: "Handheld Breakers", nameAr: "كسارات يدوية", sortOrder: 3 },
      { slug: "power-trowels", nameEn: "Power Trowels", nameAr: "مالجات آلية", sortOrder: 4 },
      { slug: "concrete-vibrators", nameEn: "Concrete Vibrators", nameAr: "هزازات خرسانة", sortOrder: 5 },
      { slug: "floor-saws", nameEn: "Floor Saws", nameAr: "مناشير أرضية", sortOrder: 6 },
      { slug: "rammers", nameEn: "Rammers / Jumping Jacks", nameAr: "دكاكات قافزة", sortOrder: 7 },
    ],
  },
  // NEW: Drilling & Piling - Essential for Saudi mega-projects
  {
    slug: "drilling-piling",
    nameEn: "Drilling & Piling",
    nameAr: "الحفر والخوازيق",
    descriptionEn: "Equipment for foundation work, piling, and drilling operations",
    descriptionAr: "معدات لأعمال الأساسات والخوازيق وعمليات الحفر",
    sortOrder: 8,
    attributeSchema: {
      required: ["maxDrillingDepth"],
      fields: [
        { key: "maxDrillingDepth", label: "Max Drilling Depth", labelAr: "أقصى عمق حفر", type: "number", unit: "m" },
        { key: "maxDrillingDiameter", label: "Max Drilling Diameter", labelAr: "أقصى قطر حفر", type: "number", unit: "mm" },
        { key: "torque", label: "Max Torque", labelAr: "أقصى عزم دوران", type: "number", unit: "kNm" },
        { key: "pileCapacity", label: "Pile Capacity", labelAr: "سعة الخازوق", type: "number", unit: "tons" },
        { key: "operatingWeight", label: "Operating Weight", labelAr: "الوزن التشغيلي", type: "number", unit: "tons" },
      ],
    },
    children: [
      { slug: "piling-rigs", nameEn: "Piling Rigs", nameAr: "آلات الخوازيق", sortOrder: 1 },
      { slug: "rotary-drilling-rigs", nameEn: "Rotary Drilling Rigs", nameAr: "آلات حفر دورانية", sortOrder: 2 },
      { slug: "cfa-rigs", nameEn: "CFA (Continuous Flight Auger) Rigs", nameAr: "آلات حفر لولبية مستمرة", sortOrder: 3 },
      { slug: "hydraulic-hammers-piling", nameEn: "Hydraulic Pile Hammers", nameAr: "مطارق خوازيق هيدروليكية", sortOrder: 4 },
      { slug: "vibratory-hammers", nameEn: "Vibratory Pile Hammers", nameAr: "مطارق خوازيق اهتزازية", sortOrder: 5 },
      { slug: "sheet-pile-drivers", nameEn: "Sheet Pile Drivers", nameAr: "آلات دق ألواح معدنية", sortOrder: 6 },
      { slug: "water-well-drills", nameEn: "Water Well Drilling Rigs", nameAr: "آلات حفر آبار المياه", sortOrder: 7 },
      { slug: "foundation-drill-rigs", nameEn: "Foundation Drill Rigs", nameAr: "آلات حفر الأساسات", sortOrder: 8 },
      { slug: "micro-piling-rigs", nameEn: "Micro Piling Rigs", nameAr: "آلات خوازيق صغيرة", sortOrder: 9 },
    ],
  },
  // NEW: Attachments - Often rented separately from machines
  {
    slug: "attachments",
    nameEn: "Attachments",
    nameAr: "الملحقات",
    descriptionEn: "Attachments and accessories for excavators, loaders, and other heavy equipment",
    descriptionAr: "ملحقات وإكسسوارات للحفارات واللوادر والمعدات الثقيلة الأخرى",
    sortOrder: 9,
    attributeSchema: {
      required: ["compatibleMachines"],
      fields: [
        { key: "compatibleMachines", label: "Compatible Machine Weight", labelAr: "وزن الآلة المتوافقة", type: "text", unit: "tons" },
        { key: "width", label: "Width", labelAr: "العرض", type: "number", unit: "mm" },
        { key: "capacity", label: "Capacity", labelAr: "السعة", type: "number", unit: "m³" },
        { key: "weight", label: "Attachment Weight", labelAr: "وزن الملحق", type: "number", unit: "kg" },
        { key: "mountingType", label: "Mounting Type", labelAr: "نوع التركيب", type: "select", options: ["Pin-on", "Quick Coupler", "Universal"] },
      ],
    },
    children: [
      { slug: "buckets-gp", nameEn: "General Purpose Buckets", nameAr: "دلاء متعددة الاستخدام", sortOrder: 1 },
      { slug: "buckets-rock", nameEn: "Rock Buckets", nameAr: "دلاء صخرية", sortOrder: 2 },
      { slug: "buckets-trenching", nameEn: "Trenching Buckets", nameAr: "دلاء حفر خنادق", sortOrder: 3 },
      { slug: "buckets-skeleton", nameEn: "Skeleton / Sieve Buckets", nameAr: "دلاء شبكية", sortOrder: 4 },
      { slug: "buckets-tilt", nameEn: "Tilt Buckets", nameAr: "دلاء مائلة", sortOrder: 5 },
      { slug: "hydraulic-breakers", nameEn: "Hydraulic Breakers / Hammers", nameAr: "كسارات هيدروليكية", sortOrder: 6 },
      { slug: "grapples", nameEn: "Grapples", nameAr: "كلابات", sortOrder: 7 },
      { slug: "clamshells", nameEn: "Clamshells", nameAr: "قواقع", sortOrder: 8 },
      { slug: "auger-attachments", nameEn: "Auger Attachments", nameAr: "ملحقات لولبية", sortOrder: 9 },
      { slug: "quick-couplers", nameEn: "Quick Couplers", nameAr: "وصلات سريعة", sortOrder: 10 },
      { slug: "rippers", nameEn: "Rippers", nameAr: "أنياب تكسير", sortOrder: 11 },
      { slug: "compactor-wheels", nameEn: "Compactor Wheels", nameAr: "عجلات دك", sortOrder: 12 },
      { slug: "thumbs", nameEn: "Thumbs", nameAr: "إبهامات", sortOrder: 13 },
      { slug: "forks-pallet", nameEn: "Pallet Forks", nameAr: "شوك البليتات", sortOrder: 14 },
      { slug: "crusher-buckets", nameEn: "Crusher Buckets", nameAr: "دلاء كسارة", sortOrder: 15 },
    ],
  },
  // NEW: Site Services - Accommodation, storage, and temp control
  {
    slug: "site-services",
    nameEn: "Site Services",
    nameAr: "خدمات الموقع",
    descriptionEn: "Site accommodation, storage containers, and temporary facilities",
    descriptionAr: "إقامة الموقع وحاويات التخزين والمرافق المؤقتة",
    sortOrder: 10,
    attributeSchema: {
      required: ["dimensions"],
      fields: [
        { key: "dimensions", label: "Dimensions (LxWxH)", labelAr: "الأبعاد (طول×عرض×ارتفاع)", type: "text", unit: "m" },
        { key: "capacity", label: "Capacity", labelAr: "السعة", type: "number", unit: "" },
        { key: "coolingCapacity", label: "Cooling Capacity", labelAr: "قدرة التبريد", type: "number", unit: "BTU" },
        { key: "tankCapacity", label: "Tank Capacity", labelAr: "سعة الخزان", type: "number", unit: "liters" },
        { key: "powerRequirement", label: "Power Requirement", labelAr: "متطلبات الطاقة", type: "text", unit: "" },
      ],
    },
    children: [
      { slug: "portable-offices", nameEn: "Portable Offices / Site Cabins", nameAr: "مكاتب متنقلة", sortOrder: 1 },
      { slug: "accommodation-units", nameEn: "Accommodation Units", nameAr: "وحدات سكنية", sortOrder: 2 },
      { slug: "portable-toilets", nameEn: "Portable Toilets", nameAr: "دورات مياه متنقلة", sortOrder: 3 },
      { slug: "ablution-units", nameEn: "Ablution Units", nameAr: "وحدات وضوء", sortOrder: 4 },
      { slug: "storage-containers", nameEn: "Storage Containers", nameAr: "حاويات تخزين", sortOrder: 5 },
      { slug: "refrigerated-containers", nameEn: "Refrigerated Containers", nameAr: "حاويات مبردة", sortOrder: 6 },
      { slug: "fuel-storage-tanks", nameEn: "Fuel Storage Tanks", nameAr: "خزانات وقود", sortOrder: 7 },
      { slug: "water-storage-tanks", nameEn: "Water Storage Tanks", nameAr: "خزانات مياه", sortOrder: 8 },
      { slug: "portable-ac", nameEn: "Portable Air Conditioners", nameAr: "مكيفات متنقلة", sortOrder: 9 },
      { slug: "evaporative-coolers", nameEn: "Evaporative Coolers", nameAr: "مبردات تبخيرية", sortOrder: 10 },
      { slug: "industrial-fans", nameEn: "Industrial Fans", nameAr: "مراوح صناعية", sortOrder: 11 },
      { slug: "temporary-fencing", nameEn: "Temporary Fencing", nameAr: "أسوار مؤقتة", sortOrder: 12 },
      { slug: "site-barriers", nameEn: "Safety Barriers", nameAr: "حواجز أمان", sortOrder: 13 },
    ],
  },
  {
    slug: "other",
    nameEn: "Other Equipment",
    nameAr: "معدات أخرى",
    descriptionEn: "Other industrial and construction equipment not listed in main categories",
    descriptionAr: "معدات صناعية وإنشائية أخرى غير مدرجة في الفئات الرئيسية",
    sortOrder: 99,
    attributeSchema: {
      required: [],
      fields: [
        { key: "weight", label: "Weight", labelAr: "الوزن", type: "number", unit: "kg" },
        { key: "description", label: "Equipment Type", labelAr: "نوع المعدة", type: "text", unit: "" },
      ],
    },
    children: [],
  },
];

// Test users and equipment for development
const testUsers = [
  {
    email: "owner@test.com",
    phone: "+966501234567",
    fullName: "Abdullah Al-Rashid",
    role: "OWNER" as const,
    country: "SA" as const,
    businessProfile: {
      businessType: "RENTAL_COMPANY" as const,
      companyNameEn: "Al-Rashid Heavy Equipment",
      companyNameAr: "معدات الراشد الثقيلة",
      crNumber: "1010123456",
      vatNumber: "300012345678901",
      crVerificationStatus: "VERIFIED" as const,
      city: "Riyadh",
      region: "Riyadh Region",
    },
  },
  {
    email: "owner2@test.com",
    phone: "+97338123456",
    fullName: "Mohammed Al-Khalifa",
    role: "OWNER" as const,
    country: "BH" as const,
    businessProfile: {
      businessType: "RENTAL_COMPANY" as const,
      companyNameEn: "Khalifa Equipment Rental",
      companyNameAr: "تأجير معدات الخليفة",
      crNumber: "BH-78901",
      vatNumber: null,
      crVerificationStatus: "PENDING" as const,
      city: "Manama",
      region: "Capital",
    },
  },
  {
    email: "renter@test.com",
    phone: "+966559876543",
    fullName: "Fahad Al-Otaibi",
    role: "RENTER" as const,
    country: "SA" as const,
    businessProfile: null,
  },
];

const testEquipment = [
  {
    titleEn: "CAT 320 Excavator - Excellent Condition",
    titleAr: "حفارة كاتربيلر 320 - حالة ممتازة",
    descriptionEn: "2021 Caterpillar 320 hydraulic excavator with low hours. Perfect for construction and earthmoving projects. Includes GPS and climate-controlled cab. Regular maintenance records available. Contact via WhatsApp for quick response.",
    descriptionAr: "حفارة كاتربيلر 320 هيدروليكية موديل 2021 بساعات عمل منخفضة. مثالية لمشاريع البناء ونقل التربة. تشمل نظام GPS وكابينة مكيفة. سجلات الصيانة الدورية متوفرة. تواصل عبر واتساب للرد السريع.",
    make: "Caterpillar",
    model: "320",
    year: 2021,
    condition: "EXCELLENT" as const,
    hoursUsed: 2500,
    listingType: "BOTH" as const,
    rentalPrice: "1500",
    rentalPriceUnit: "day",
    salePrice: "850000",
    currency: "SAR" as const,
    locationCity: "Riyadh",
    locationRegion: "Riyadh Region",
    locationCountry: "SA" as const,
    categorySlug: "excavators",
    ownerIndex: 0, // Abdullah
    specifications: {
      operatingWeight: 22000,
      bucketCapacity: 1.2,
      digDepth: 6.7,
      reach: 9.9,
      enginePower: 163,
    },
    images: [
      "https://images.unsplash.com/photo-1580901368919-7738efb0f87e?w=800&q=80",
      "https://images.unsplash.com/photo-1621922688758-359fc864071e?w=800&q=80",
    ],
  },
  {
    titleEn: "Komatsu WA470 Wheel Loader - For Sale",
    titleAr: "لودر كوماتسو WA470 - للبيع",
    descriptionEn: "2019 Komatsu WA470-8 wheel loader. Well maintained with new tires. Ideal for quarry and mining operations. Available immediately. Price negotiable for serious buyers.",
    descriptionAr: "لودر كوماتسو WA470-8 موديل 2019. صيانة جيدة مع إطارات جديدة. مثالي لعمليات المحاجر والتعدين. متاح فوراً. السعر قابل للتفاوض للمشترين الجادين.",
    make: "Komatsu",
    model: "WA470-8",
    year: 2019,
    condition: "GOOD" as const,
    hoursUsed: 5200,
    listingType: "FOR_SALE" as const,
    rentalPrice: null,
    rentalPriceUnit: null,
    salePrice: "650000",
    currency: "SAR" as const,
    locationCity: "Dammam",
    locationRegion: "Eastern Province",
    locationCountry: "SA" as const,
    categorySlug: "wheel-loaders",
    ownerIndex: 0, // Abdullah
    specifications: {
      operatingWeight: 24500,
      bucketCapacity: 4.2,
      enginePower: 264,
    },
    images: [
      "https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=800&q=80",
    ],
  },
  {
    titleEn: "Liebherr LTM 1100 Mobile Crane - With Operator",
    titleAr: "رافعة ليبهر LTM 1100 متحركة - مع مشغل",
    descriptionEn: "2020 Liebherr LTM 1100-4.2 all-terrain mobile crane. 100-ton capacity. Full service history. Available for long-term rental with certified operator. Ideal for large construction projects.",
    descriptionAr: "رافعة ليبهر LTM 1100-4.2 متحركة لجميع التضاريس موديل 2020. سعة 100 طن. تاريخ خدمة كامل. متاحة للإيجار طويل الأمد مع مشغل معتمد. مثالية للمشاريع الإنشائية الكبيرة.",
    make: "Liebherr",
    model: "LTM 1100-4.2",
    year: 2020,
    condition: "EXCELLENT" as const,
    hoursUsed: 3800,
    listingType: "FOR_RENT" as const,
    rentalPrice: "5000",
    rentalPriceUnit: "day",
    salePrice: null,
    currency: "SAR" as const,
    locationCity: "Jeddah",
    locationRegion: "Makkah Region",
    locationCountry: "SA" as const,
    categorySlug: "mobile-cranes",
    ownerIndex: 0, // Abdullah
    specifications: {
      maxLiftCapacity: 100,
      maxLiftHeight: 60,
      boomLength: 52,
    },
    images: [
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80",
      "https://images.unsplash.com/photo-1590496793929-36417d3117de?w=800&q=80",
    ],
  },
  {
    titleEn: "JCB 3CX Backhoe Loader - Daily Rental",
    titleAr: "لودر خلفي JCB 3CX - إيجار يومي",
    descriptionEn: "2022 JCB 3CX backhoe loader available for daily or weekly rental. Perfect for small to medium construction sites. Delivery available within Bahrain. Call or WhatsApp anytime.",
    descriptionAr: "لودر خلفي JCB 3CX موديل 2022 متاح للإيجار اليومي أو الأسبوعي. مثالي لمواقع البناء الصغيرة والمتوسطة. التوصيل متاح داخل البحرين. اتصل أو واتساب في أي وقت.",
    make: "JCB",
    model: "3CX",
    year: 2022,
    condition: "EXCELLENT" as const,
    hoursUsed: 800,
    listingType: "FOR_RENT" as const,
    rentalPrice: "150",
    rentalPriceUnit: "day",
    salePrice: null,
    currency: "BHD" as const,
    locationCity: "Manama",
    locationRegion: "Capital",
    locationCountry: "BH" as const,
    categorySlug: "backhoe-loaders",
    ownerIndex: 1, // Mohammed (Bahrain)
    specifications: {
      operatingWeight: 8000,
      bucketCapacity: 1.0,
      digDepth: 5.5,
      enginePower: 92,
    },
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    ],
  },
  {
    titleEn: "500 KVA Cummins Generator - Weekly/Monthly Rental",
    titleAr: "مولد كمنز 500 كيلو فولت أمبير - إيجار أسبوعي/شهري",
    descriptionEn: "Cummins 500 KVA diesel generator. Silent type, suitable for events and construction sites. Weekly and monthly rates available. Fuel not included. Can deliver anywhere in Riyadh.",
    descriptionAr: "مولد ديزل كمنز 500 كيلو فولت أمبير. نوع صامت، مناسب للفعاليات ومواقع البناء. أسعار أسبوعية وشهرية متاحة. الوقود غير مشمول. التوصيل لأي مكان في الرياض.",
    make: "Cummins",
    model: "C500D5",
    year: 2021,
    condition: "GOOD" as const,
    hoursUsed: 4500,
    listingType: "FOR_RENT" as const,
    rentalPrice: "800",
    rentalPriceUnit: "day",
    salePrice: null,
    currency: "SAR" as const,
    locationCity: "Riyadh",
    locationRegion: "Riyadh Region",
    locationCountry: "SA" as const,
    categorySlug: "diesel-generators",
    ownerIndex: 0, // Abdullah
    specifications: {
      powerOutput: 500,
      fuelType: "Diesel",
    },
    images: [
      "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&q=80",
    ],
  },
  {
    titleEn: "Toyota 3-Ton Forklift - Low Hours",
    titleAr: "رافعة شوكية تويوتا 3 طن - ساعات منخفضة",
    descriptionEn: "2020 Toyota 8FGU30 forklift. 3-ton capacity, LPG powered. Only 1,200 hours. Side shift and fork positioner included. Perfect for warehouse operations.",
    descriptionAr: "رافعة شوكية تويوتا 8FGU30 موديل 2020. سعة 3 طن، تعمل بالغاز. 1,200 ساعة فقط. تشمل جهاز تحريك جانبي ومحدد موقع الشوكات. مثالية لعمليات المستودعات.",
    make: "Toyota",
    model: "8FGU30",
    year: 2020,
    condition: "EXCELLENT" as const,
    hoursUsed: 1200,
    listingType: "BOTH" as const,
    rentalPrice: "300",
    rentalPriceUnit: "day",
    salePrice: "95000",
    currency: "SAR" as const,
    locationCity: "Riyadh",
    locationRegion: "Riyadh Region",
    locationCountry: "SA" as const,
    categorySlug: "forklifts",
    ownerIndex: 0, // Abdullah
    specifications: {
      maxLiftCapacity: 3,
      maxLiftHeight: 6,
    },
    images: [
      "https://images.unsplash.com/photo-1616432043562-3671ea2e5242?w=800&q=80",
    ],
  },
];

async function main() {
  console.log("Starting database seed...");

  // Clear existing data (in development only)
  if (process.env.NODE_ENV !== "production") {
    console.log("Clearing existing data...");
    await prisma.equipmentImage.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.equipment.deleteMany();
    await prisma.businessProfile.deleteMany();
    await prisma.user.deleteMany();
    await prisma.category.deleteMany();
  }

  console.log("Creating categories...");

  for (const category of categories) {
    const { children, ...parentData } = category;

    // Create parent category
    const parent = await prisma.category.create({
      data: {
        slug: parentData.slug,
        nameEn: parentData.nameEn,
        nameAr: parentData.nameAr,
        descriptionEn: parentData.descriptionEn,
        descriptionAr: parentData.descriptionAr,
        sortOrder: parentData.sortOrder,
        attributeSchema: parentData.attributeSchema,
        isActive: true,
      },
    });

    console.log(`  Created: ${parent.nameEn}`);

    // Create child categories
    if (children && children.length > 0) {
      for (const child of children) {
        await prisma.category.create({
          data: {
            slug: child.slug,
            nameEn: child.nameEn,
            nameAr: child.nameAr,
            sortOrder: child.sortOrder,
            parentId: parent.id,
            isActive: true,
          },
        });
        console.log(`    - ${child.nameEn}`);
      }
    }
  }

  console.log("\nCreating test users...");

  // Create test users with business profiles
  const createdUsers: { id: string; phone: string }[] = [];

  for (const user of testUsers) {
    const { businessProfile, ...userData } = user;

    const createdUser = await prisma.user.create({
      data: {
        email: userData.email,
        phone: userData.phone,
        fullName: userData.fullName,
        role: userData.role,
        country: userData.country,
        preferredLanguage: "en",
        preferredCurrency: userData.country === "SA" ? "SAR" : "BHD",
        ...(businessProfile && {
          businessProfile: {
            create: {
              businessType: businessProfile.businessType,
              companyNameEn: businessProfile.companyNameEn,
              companyNameAr: businessProfile.companyNameAr,
              crNumber: businessProfile.crNumber,
              vatNumber: businessProfile.vatNumber,
              crVerificationStatus: businessProfile.crVerificationStatus,
              city: businessProfile.city,
              region: businessProfile.region,
              country: userData.country,
            },
          },
        }),
      },
    });

    createdUsers.push({ id: createdUser.id, phone: createdUser.phone || "" });
    console.log(`  Created user: ${userData.fullName} (${userData.role})`);
  }

  console.log("\nCreating test equipment...");

  // Get category IDs by slug
  const categoryMap = new Map<string, string>();
  const allCategories = await prisma.category.findMany();
  for (const cat of allCategories) {
    categoryMap.set(cat.slug, cat.id);
  }

  for (const equipment of testEquipment) {
    const categoryId = categoryMap.get(equipment.categorySlug);
    if (!categoryId) {
      console.log(`  Skipped: ${equipment.titleEn} (category not found: ${equipment.categorySlug})`);
      continue;
    }

    const owner = createdUsers[equipment.ownerIndex];
    if (!owner) {
      console.log(`  Skipped: ${equipment.titleEn} (owner not found)`);
      continue;
    }

    const createdEquipment = await prisma.equipment.create({
      data: {
        titleEn: equipment.titleEn,
        titleAr: equipment.titleAr,
        descriptionEn: equipment.descriptionEn,
        descriptionAr: equipment.descriptionAr,
        make: equipment.make,
        model: equipment.model,
        year: equipment.year,
        condition: equipment.condition,
        hoursUsed: equipment.hoursUsed,
        listingType: equipment.listingType,
        rentalPrice: equipment.rentalPrice ? parseFloat(equipment.rentalPrice) : null,
        rentalPriceUnit: equipment.rentalPriceUnit,
        salePrice: equipment.salePrice ? parseFloat(equipment.salePrice) : null,
        currency: equipment.currency,
        locationCity: equipment.locationCity,
        locationRegion: equipment.locationRegion,
        locationCountry: equipment.locationCountry,
        contactPhone: owner.phone,
        specifications: equipment.specifications,
        status: "ACTIVE",
        categoryId,
        ownerId: owner.id,
        images: {
          create: equipment.images.map((url, index) => ({
            url,
            isPrimary: index === 0,
            sortOrder: index,
          })),
        },
      },
    });

    console.log(`  Created: ${equipment.titleEn}`);
  }

  console.log("\n✅ Database seeded successfully!");
  console.log(`Created ${categories.length} parent categories with subcategories.`);
  console.log(`Created ${testUsers.length} test users.`);
  console.log(`Created ${testEquipment.length} test equipment listings.`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
