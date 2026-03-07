"use client";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";

export function TermsPrivacyDialog() {
  return (
    <p className="text-center leading-relaxed text-xs text-muted-foreground">
      By continuing, you agree to the{" "}
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Terms of Service
          </button>
        </DialogTrigger>

        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Terms of Service</DialogTitle>
            <DialogDescription>
              Please review the terms below.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto rounded-md border p-4 text-sm text-foreground">
            <TermsOfServiceContent />
          </div>

          <div className="flex justify-end pt-3">
            <DialogClose asChild>
              <button
                type="button"
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
              >
                Close
              </button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
      {" "}and{" "}
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Privacy Policy
          </button>
        </DialogTrigger>

        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Privacy Policy</DialogTitle>
            <DialogDescription>
              Please review the policy below.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto rounded-md border p-4 text-sm text-foreground">
            <PrivacyPolicyContent />
          </div>

          <div className="flex justify-end pt-3">
            <DialogClose asChild>
              <button
                type="button"
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
              >
                Close
              </button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
      .
    </p>
  );
}

function TermsOfServiceContent() {
  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h3 className="text-base font-semibold">1. Overview</h3>
        <p>
          These Terms govern your access to and use of Umbrella SaaS and related
          services.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold">2. Accounts</h3>
        <p>
          You are responsible for maintaining the confidentiality of your
          account credentials and for all activities under your account.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold">3. Acceptable Use</h3>
        <p>
          Do not misuse the service, attempt unauthorized access, or interfere
          with system integrity or availability.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold">4. Changes</h3>
        <p>
          We may update these Terms from time to time. Continued use after
          changes means you accept the updated Terms.
        </p>
      </section>

      <p className="text-xs text-muted-foreground">
        Placeholder text — replace with your legal wording.
      </p>
    </div>
  );
}

function PrivacyPolicyContent() {
  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h3 className="text-base font-semibold">1. Data We Collect</h3>
        <p>
          We collect account information (such as email) and usage data necessary
          to operate and improve the service.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold">2. How We Use Data</h3>
        <p>
          We use data to provide the service, maintain security, comply with
          legal obligations, and improve user experience.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold">3. Sharing</h3>
        <p>
          We do not sell personal data. We may share data with processors
          necessary to deliver the service and as required by law.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold">4. Retention</h3>
        <p>
          We retain data only as long as needed for the purposes described or as
          required by law.
        </p>
      </section>

      <p className="text-xs text-muted-foreground">
        Placeholder text — replace with your legal wording.
      </p>
    </div>
  );
}
