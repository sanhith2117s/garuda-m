export const fmtDate = (d?: string | null): string => {
  if (!d) return '—';
  try {
    let str = d.trim();
    // If timezone is missing, specify +05:30 IST offset for backend timestamps
    if (!str.endsWith('Z') && !str.includes('+') && !/T.*\d{2}:\d{2}-\d{2}/.test(str)) {
      str = `${str}+05:30`;
    }
    const dt = new Date(str);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch {
    return d;
  }
};

export const fmtTime = (d?: string | null): string => {
  if (!d) return '—';
  try {
    let str = d.trim();
    if (!str.endsWith('Z') && !str.includes('+') && !/T.*\d{2}:\d{2}-\d{2}/.test(str)) {
      str = `${str}+05:30`;
    }
    const dt = new Date(str);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch {
    return d;
  }
};
