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
