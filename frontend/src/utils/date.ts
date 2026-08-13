export const formatDateStr = (dateStr: any): string => {
  if (!dateStr) return "—";
  const str = String(dateStr).trim();
  const [datePart, timePart] = str.split(" ");
  const parts = datePart.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    return timePart ? `${formattedDate} ${timePart}` : formattedDate;
  }
  return str;
};
