"use client";

import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

interface FooterProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * App footer with TfL attribution and links.
 * Required for TfL Open Data usage compliance.
 */
export function Footer({ className }: FooterProps) {
  return (
    <footer
      className={cn(
        "border-t bg-muted/30 py-6 mt-auto",
        className
      )}
    >
      <div className="container px-4 max-w-3xl mx-auto">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* TfL Attribution */}
          <p className="text-sm text-muted-foreground">
            Powered by{" "}
            <a
              href="https://api.tfl.gov.uk/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-tfl-blue transition-colors inline-flex items-center gap-1"
            >
              TfL Open Data
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>

          {/* Legal notice */}
          <p className="text-xs text-muted-foreground max-w-md">
            Contains Transport for London data. TfL data is provided under the{" "}
            <a
              href="https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              Open Government Licence
            </a>
            .
          </p>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Commute Copilot
          </p>
        </div>
      </div>
    </footer>
  );
}

