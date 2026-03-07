// src/lib/services/phoneId/mappings.ts

export function mapPhoneIdStatusCode(code: number | null | undefined): string {
  switch (code) {
    case 300:
      return "Transaction successfully completed";
    case 301:
      return "Transaction partially completed";
    case 400:
      return "Invalid request";
    case 401:
      return "Authentication failed.";
    case 404:
      return "The server could not find the requested resource.";
    case 429:
      return "Too many requests";  
    case 500:
      return "Internal server error";
    case 503:
      return "Service unavailable";  
    default:
      return "Unknown status";
  }
}

export function mapPhoneIdAddonStatusCode(code: number | null | undefined): string {
  switch (code) {
    case 2800:
      return "Request successfully completed";
    case 2805:
      return "No information available for this phone number";
    case 2806:
      return "This feature is not enabled for your account";
    default:
      return "Unknown add-on status";
  }
}

export function mapCleansingCode(code: number | null | undefined): string {
  switch (code) {
    case 100:
      return "Valid number format";
    case 101:
      return "Number format adjusted";
    case 102:
      return "Restricted number";
    case 103:
      return "No match";
    case 104:
      return "Invalid number format";
    case 105:
      return "Partial match";
    default:
      return "Unknown number format result";
  }
}