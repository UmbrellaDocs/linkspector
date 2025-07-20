/**
 * Validates and fixes RDJSON output using the @umbrelladocs/rdformat-validator package
 *
 * @param {Object} rdjsonData - The RDJSON data to validate and fix
 * @returns {Promise<Object>} - Object containing validation result and fixed data or error message
 */

import { validateAndFix } from '@umbrelladocs/rdformat-validator'

/**
 * Validates and fixes RDJSON data
 * @param {Object} rdjsonData - The RDJSON data to validate and fix
 * @returns {Promise<Object>} - Result object with validation status and fixed data or error
 */
export async function validateAndFixRDJSON(rdjsonData) {
  try {
    // Ensure input is an object
    if (!rdjsonData || typeof rdjsonData !== 'object') {
      return {
        success: false,
        data: null,
        message: 'Invalid input: RDJSON data must be an object',
      }
    }

    // First validate and attempt to fix the RDJSON data
    const result = await validateAndFix(rdjsonData, {
      fixLevel: 'basic', // Start with basic fixes
      strictMode: false,
      allowExtraFields: true,
    })

    if (result.valid) {
      // Data is valid, return as-is or with fixes applied
      return {
        success: true,
        data: result.fixedData || rdjsonData,
        appliedFixes: result.appliedFixes || [],
        message:
          result.appliedFixes && result.appliedFixes.length > 0
            ? `RDJSON validated and ${result.appliedFixes.length} fixes applied`
            : 'RDJSON is valid',
      }
    } else {
      // Try aggressive fixing if basic fixing didn't work
      const aggressiveResult = await validateAndFix(rdjsonData, {
        fixLevel: 'aggressive',
        strictMode: false,
        allowExtraFields: true,
      })

      if (aggressiveResult.valid && aggressiveResult.fixedData) {
        return {
          success: true,
          data: aggressiveResult.fixedData,
          appliedFixes: aggressiveResult.appliedFixes || [],
          message: `RDJSON fixed with aggressive mode - ${aggressiveResult.appliedFixes?.length || 0} fixes applied`,
        }
      } else {
        // Both validation and fixing failed
        const errorMessages =
          result.errors
            ?.map((err) => `${err.path}: ${err.message}`)
            .join('; ') || 'Unknown validation errors'

        return {
          success: false,
          data: null,
          errors: result.errors || [],
          message: `RDJSON validation failed: ${errorMessages}`,
        }
      }
    }
  } catch (error) {
    // Handle unexpected errors during validation/fixing
    return {
      success: false,
      data: null,
      error: error.message,
      message: `RDJSON validation/fixing process failed: ${error.message}`,
    }
  }
}

/**
 * Ensures minimal RDJSON structure when no diagnostics are present
 * @param {boolean} hasErrors - Whether there are any error links
 * @returns {Object} - Minimal valid RDJSON structure
 */
export function createEmptyRDJSON(hasErrors = false) {
  return {
    source: {
      name: 'linkspector',
      url: 'https://github.com/UmbrellaDocs/linkspector',
    },
    severity: hasErrors ? 'ERROR' : 'INFO',
    diagnostics: [],
  }
}

/**
 * Validates a diagnostic object and ensures it has all required fields
 * @param {Object} diagnostic - The diagnostic object to validate
 * @param {string} filePath - The file path for the diagnostic
 * @returns {Object} - Validated and corrected diagnostic object
 */
export function validateDiagnostic(diagnostic, filePath) {
  // Ensure diagnostic is an object
  if (!diagnostic || typeof diagnostic !== 'object') {
    return {
      message: 'Unknown error',
      location: {
        path: filePath || 'unknown',
        range: {
          start: { line: 1, column: 1 },
          end: { line: 1, column: 1 },
        },
      },
      severity: 'ERROR',
    }
  }

  const validatedDiagnostic = {
    message: diagnostic.message || 'Unknown error',
    location: {
      path: filePath || diagnostic.location?.path || 'unknown',
      range: {
        start: {
          line: Math.max(1, diagnostic.location?.range?.start?.line || 1),
          column: Math.max(1, diagnostic.location?.range?.start?.column || 1),
        },
        end: {
          line: Math.max(
            1,
            diagnostic.location?.range?.end?.line ||
              diagnostic.location?.range?.start?.line ||
              1
          ),
          column: Math.max(
            1,
            diagnostic.location?.range?.end?.column ||
              diagnostic.location?.range?.start?.column ||
              1
          ),
        },
      },
    },
    severity: diagnostic.severity || 'ERROR',
  }

  // Add optional fields if they exist and are valid
  if (
    diagnostic.source &&
    (typeof diagnostic.source === 'string' ||
      typeof diagnostic.source === 'object')
  ) {
    validatedDiagnostic.source = diagnostic.source
  }

  if (diagnostic.code) {
    validatedDiagnostic.code = diagnostic.code
  }

  return validatedDiagnostic
}
