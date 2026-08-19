import { toProductSourceFailure, type ProductSourceFailureCode } from "@/features/products/domain/types";

/** Thrown by the Amazon adapter on any non-recoverable request outcome.
 *  Carries the domain's own `ProductSourceFailureCode` taxonomy so callers
 *  can branch on `.code`/`.retryable` instead of parsing `.message`. */
export class ProductSourceHttpError extends Error {
  readonly code: ProductSourceFailureCode;
  readonly retryable: boolean;

  constructor(code: ProductSourceFailureCode, message: string) {
    super(message);
    this.name = "ProductSourceHttpError";
    const failure = toProductSourceFailure(code, message);
    this.code = failure.code;
    this.retryable = failure.retryable;
  }
}

/** Maps an HTTP response status (PA-API uses standard HTTP status codes for
 *  auth/throttling/server errors) to a domain failure code. */
export function mapHttpStatusToFailureCode(status: number): ProductSourceFailureCode {
  if (status === 401 || status === 403) return "AUTHENTICATION_FAILED";
  if (status === 404) return "PRODUCT_NOT_FOUND";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "PLATFORM_UNAVAILABLE";
  return "INVALID_RESPONSE";
}

/** Maps a PA-API `Errors[].Code` (returned inside an HTTP 200 body for
 *  partial failures) to a domain failure code. */
export function mapPaApiErrorCode(code: string): ProductSourceFailureCode {
  switch (code) {
    case "InvalidPartnerTag":
    case "InvalidAssociate":
    case "AccessDenied":
    case "UnauthorizedException":
      return "AUTHENTICATION_FAILED";
    case "TooManyRequests":
    case "RequestThrottled":
      return "RATE_LIMITED";
    case "ItemNotAccessible":
    case "NoResults":
      return "PRODUCT_NOT_FOUND";
    case "InvalidParameterValue":
    case "MissingParameter":
    case "InvalidSearchIndex":
      return "INVALID_RESPONSE";
    default:
      return "UNKNOWN_ERROR";
  }
}
