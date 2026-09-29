import { useCallback, useState } from 'react';

function withoutKey(object, key) {
  if (!(key in object)) return object;
  const { [key]: _removed, ...rest } = object;
  return rest;
}

export function useForm({ initialValues, validate }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  const setFieldValue = useCallback((name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => withoutKey(current, name));
  }, []);

  const validateForm = useCallback(() => {
    const validationErrors = validate(values);
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  }, [validate, values]);

  return { values, errors, setFieldValue, setErrors, validateForm };
}
