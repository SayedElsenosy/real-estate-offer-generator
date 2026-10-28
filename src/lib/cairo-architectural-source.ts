// Cairo Plaza architectural source-of-truth is the engineering-department DWG.
// The earlier PDF-based geometries are legacy drafts and must never be displayed,
// approved, or included in new customer proposals.
export const CAIRO_PLAZA_PROJECT_ID = "cairo-plaza";
export const CAIRO_PLAZA_SOURCE_FORMAT = "DWG";
export const CAIRO_PLAZA_SOURCE_SHA256 = "9c9aac1fcf2b330fbbb5e3555b86300b922ac1a33037e4ea51510ece82792c6a";
export const CAIRO_PLAZA_SOURCE_NAME = "معماري كايرو بلازا(1).dwg";
export function hasAuthoritativeCairoDwgSource(
  floor: { sourceFileSha256?: string | null } | null | undefined
): boolean {
  return !!floor && floor.sourceFileSha256 === CAIRO_PLAZA_SOURCE_SHA256;
}
