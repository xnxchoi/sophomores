/**
 * Generates a regex to validate a qs-esm-style query string for arrays
 * where only the given valid values are allowed.
 *
 * @param validValues - List of allowed string values (e.g., ["posts", "surf"]).
 * @returns A RegExp object for validating the query string.
 */
export function createValidQueryStringRegex(validValues: string[]): RegExp {
  // Escape regex-special characters in valid values
  const escapedValues = validValues.map((v) =>
    v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );

  // Join them into a regex group: (posts|surf|...)
  const validValuesPattern = `(${escapedValues.join("|")})`;

  // Create the full pattern
  const pattern = `^(types(\$begin:math:display$\\\\d*\\$end:math:display$)?=${validValuesPattern}(&types(\$begin:math:display$\\\\d*\\$end:math:display$)?=${validValuesPattern})*)$`;

  return new RegExp(pattern);
}
