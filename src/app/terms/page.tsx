import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
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
          <h1>Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: December 2024</p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using Equipment Souq ("the Platform"), you agree to be bound by these
            Terms of Service. If you do not agree to these terms, please do not use our services.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            Equipment Souq is a classifieds marketplace that connects equipment owners with potential
            renters and buyers. We provide a platform for listing equipment and facilitating initial
            contact between parties. We do not handle payments, rentals, or transactions directly.
          </p>

          <h2>3. User Accounts</h2>
          <p>
            To use certain features of the Platform, you must register for an account. You agree to:
          </p>
          <ul>
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Accept responsibility for all activities under your account</li>
            <li>Notify us immediately of any unauthorized use</li>
          </ul>

          <h2>4. Listing Guidelines</h2>
          <p>
            When listing equipment on the Platform, you agree that:
          </p>
          <ul>
            <li>You have the legal right to rent or sell the equipment</li>
            <li>All information provided is accurate and not misleading</li>
            <li>Photos represent the actual equipment being offered</li>
            <li>Pricing information is current and accurate</li>
          </ul>

          <h2>5. User Conduct</h2>
          <p>
            You agree not to:
          </p>
          <ul>
            <li>Post false, misleading, or fraudulent content</li>
            <li>Harass, abuse, or harm other users</li>
            <li>Violate any applicable laws or regulations</li>
            <li>Attempt to circumvent the Platform's security measures</li>
            <li>Use the Platform for any illegal purposes</li>
          </ul>

          <h2>6. Disclaimer</h2>
          <p>
            Equipment Souq is a classifieds platform only. We do not:
          </p>
          <ul>
            <li>Guarantee the quality or condition of listed equipment</li>
            <li>Verify all information provided by users</li>
            <li>Handle payments or rental agreements</li>
            <li>Assume responsibility for transactions between users</li>
          </ul>

          <h2>7. Limitation of Liability</h2>
          <p>
            Equipment Souq shall not be liable for any indirect, incidental, special, or consequential
            damages arising from your use of the Platform or any transactions with other users.
          </p>

          <h2>8. Modifications</h2>
          <p>
            We reserve the right to modify these Terms of Service at any time. Changes will be posted
            on this page with an updated revision date.
          </p>

          <h2>9. Governing Law</h2>
          <p>
            These terms shall be governed by and construed in accordance with the laws of the
            Kingdom of Saudi Arabia.
          </p>

          <h2>10. Contact</h2>
          <p>
            For questions about these Terms of Service, please contact us at{" "}
            <a href="mailto:legal@equipmentsouq.com">legal@equipmentsouq.com</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
