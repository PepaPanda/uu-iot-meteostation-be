export const isObjectEmpty = (objectName: object) => {
  return (
    objectName &&
    Object.keys(objectName).length === 0 &&
    objectName.constructor === Object
  );
};

export const toTime = (value: Date | string): number => {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
};

// Normalises timestamps coming from the database (Date objects) or elsewhere
// into a stable ISO-8601 string so every endpoint serialises dates the same way.
export const toIsoString = (value: Date | string | number): string => {
  return new Date(value).toISOString();
};

export const average = (values: number[]): number => {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
};