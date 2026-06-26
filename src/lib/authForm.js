/** Read auth field values from the form DOM (handles browser autofill before React state updates). */
export function readAuthFields(formEl, fallback = {}) {
  const fd = new FormData(formEl)
  return {
    name: String(fd.get('name') ?? fallback.name ?? '').trim(),
    email: String(fd.get('email') ?? fallback.email ?? '').trim().toLowerCase(),
    password: String(fd.get('password') ?? fallback.password ?? ''),
    confirm: String(fd.get('confirm') ?? fallback.confirm ?? ''),
  }
}

export function isEmptyAuthSubmit(values, mode) {
  if (mode === 'login') {
    return !values.email && !values.password
  }
  return !values.name && !values.email && !values.password && !values.confirm
}
