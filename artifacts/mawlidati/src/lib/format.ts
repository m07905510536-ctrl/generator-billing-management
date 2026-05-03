export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ar-IQ', {
    style: 'currency',
    currency: 'IQD',
    minimumFractionDigits: 0
  }).format(value);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("ar-IQ", {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}