export function formatAmount(value?: number | string): string {
    const num = parseFloat(String(value ?? ''));
    if (isNaN(num)) return '0';

    const [intPart, decPart] = num.toFixed(6).split('.');
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const trimmedDec = decPart?.replace(/0+$/, '');
    return trimmedDec ? `${formattedInt}.${trimmedDec}` : formattedInt;
}
