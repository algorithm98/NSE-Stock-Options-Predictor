export async function getPrediction(symbol: string) {
  const res = await fetch(`/api/predict/${symbol}`);
  if (!res.ok) throw new Error('Failed to fetch prediction');
  return res.json();
}

export async function getStockDetails(symbol: string) {
  const res = await fetch(`/api/stock/${symbol}`);
  if (!res.ok) throw new Error('Failed to fetch stock details');
  return res.json();
}
