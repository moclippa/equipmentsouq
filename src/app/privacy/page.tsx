import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
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
        <div className="max-w-3xl mx-auto prose prose-gray">
          <h1>Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: December 2024</p>

          <h2>1. Introduction</h2>
          <p>
            Equipment Souq ("we," "our," or "us") respects your privacy and is committed to
            protecting your personal data. This Privacy Policy explains how we collect, use,
            and safeguard your information when you use our platform.
          </p>

          <h2>2. Information We Collect</h2>
          <h3>Information you provide:</h3>
          <ul>
            <li>Account information (name, email, phone number)</li>
            <li>Business profile details (company name, CR number, VAT number)</li>
            <li>Equipment listing information</li>
            <li>Messages and communications through the platform</li>
          </ul>

          <h3>Information collected automatically:</h3>
          <ul>
            <li>Device information and browser type</li>
            <li>IP address and location data</li>
            <li>Usage patterns and preferences</li>
            <li>Cookies and similar technologies</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Provide and improve our services</li>
            <li>Process account registration and verification</li>
            <li>Facilitate communication between users</li>
            <li>Send important notifications and updates</li>
            <li>Ensure platform security and prevent fraud</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2>4. Information Sharing</h2>
          <p>
            We may share your information with:
          </p>
          <ul>
            <li>Other users (contact details when you respond to inquiries)</li>
            <li>Service providers who assist in our operations</li>
            <li>Legal authorities when required by law</li>
          </ul>
          <p>
            We do not sell your personal information to third parties.
          </p>

          <h2>5. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your
            personal data against unauthorized access, alteration, disclosure, or destruction.
          </p>

          <h2>6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Correct inaccurate information</li>
            <li>Request deletion of your data</li>
            <li>Object to certain processing activities</li>
            <li>Withdraw consent at any time</li>
          </ul>

          <h2>7. Cookies</h2>
          <p>
            We use cookies and similar technologies to enhance your experience, analyze usage
            patterns, and personalize content. You can control cookie preferences through your
            browser settings.
          </p>

          <h2>8. Data Retention</h2>
          <p>
            We retain your personal data for as long as necessary to fulfill the purposes
            outlined in this policy, unless a longer retention period is required by law.
          </p>

          <h2>9. International Transfers</h2>
          <p>
            Your data may be transferred to and processed in countries other than your country
            of residence. We ensure appropriate safeguards are in place for such transfers.
          </p>

          <h2>10. Children's Privacy</h2>
          <p>
            Our services are not intended for individuals under 18 years of age. We do not
            knowingly collect personal information from children.
          </p>

          <h2>11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any
            changes by posting the new policy on this page.
          </p>

          <h2>12. Contact Us</h2>
          <p>
            For questions about this Privacy Policy or your personal data, please contact us at{" "}
            <a href="mailto:privacy@equipmentsouq.com">privacy@equipmentsouq.com</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
