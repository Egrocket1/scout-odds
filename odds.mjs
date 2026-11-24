export function americanToPrice(odds) {
  if (!Number.isFinite(odds) || Math.abs(odds) < 100) throw new Error('American odds must be at least +100 or at most -100.');
  return odds > 0 ? 100 / (odds + 100) : -odds / (-odds + 100);
}
export function priceToAmerican(price) {
  if (!(price > 0 && price < 1)) throw new Error('Price must be strictly between $0 and $1.');
  return Math.round(price <= .5 ? 100 * (1-price) / price : -100 * price / (1-price));
}
export function priceToMultiplier(price) {
  if (!(price > 0 && price < 1)) throw new Error('Price must be strictly between $0 and $1.');
  return 1 / price;
}
export function multiplierLabel(price) { return `${priceToMultiplier(price).toFixed(2)}x`; }
export function withinOdds(price, filter) {
  return price > 0 && price < 1 && (!filter || (filter.exact ? Math.abs(price-filter.maxPrice)<=1e-10 : filter.inclusive ? price <= filter.maxPrice + 1e-10 : price < filter.maxPrice - 1e-10));
}
export function parseOdds(text) {
  text = text.toLowerCase().replace(/[−–]/g,'-');
  const filters = [];
  for (const m of text.matchAll(/([+-]\d{3,5})\s*(?:(?:and\s+up|or\s+better)(?:\s+only)?|only)/g)) {
    const odds = Number(m[1]);
    filters.push({maxPrice:americanToPrice(odds), inclusive:true, label:`${m[1]} or better`});
  }
  for (const m of text.matchAll(/(?:no\s+(?:bets?|odds)\s+worse\s+than|no\s+worse\s+than|better\s+than)\s*([+-]\d{3,5})/g)) {
    filters.push({maxPrice:americanToPrice(Number(m[1])), inclusive:!m[0].startsWith('better'), label:m[0]});
  }
  for (const m of text.matchAll(/(under|below|less\s+than|at\s+most|up\s+to|max(?:imum)?)\s*(\d+(?:\.\d+)?)\s*(¢|cents?\b|c\b)/g)) {
    const maxPrice = Number(m[2])/100;
    if (!(maxPrice > 0 && maxPrice < 1)) throw new Error('Cents limit must be between 0¢ and 100¢.');
    filters.push({maxPrice, inclusive:/at\s+most|up\s+to|max/.test(m[1]), label:m[0]});
  }
  if (/even money(?: or better)?|plus odds only|positive odds only/.test(text)) filters.push({maxPrice:.5,inclusive:true,label:'Even money or better'});
  for(const m of text.matchAll(/(\d+(?:\.\d+)?)\s*(?:¢|cents?\b|c\b)\s*(?:or less|or lower|maximum|max)\b/g)){const p=Number(m[1])/100;if(!(p>0&&p<1))throw new Error('Invalid cents limit.');filters.push({maxPrice:p,inclusive:true,label:m[0]});}
  const exactPrices=[...text.matchAll(/\bexactly\s*([+-]\d{3,5})(?!\d)|([+-]\d{3,5})\s+on\s+each\s+leg\b/g)]
    .map(m=>americanToPrice(Number(m[1]??m[2])));
  if(exactPrices.length){
    const price=exactPrices[0];
    if(exactPrices.some(p=>p!==price)||filters.some(filter=>!withinOdds(price,filter)))throw new Error('Conflicting odds requirements.');
    return {maxPrice:price,inclusive:true,exact:true,label:`Exactly ${priceToAmerican(price)}`};
  }
  if (!filters.length && /[+-]\d{3,5}|\d+\s*(¢|cents?\b)/.test(text)) throw new Error('Unrecognized odds limit. Use “-150 or better”, “+100 only”, or “under 60¢”.');
  return filters.sort((a,b)=>a.maxPrice-b.maxPrice || Number(a.inclusive)-Number(b.inclusive))[0] ?? null;
}
export function number(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value); return Number.isFinite(n) ? n : null;
}
export function ask(market, side, filter = null) {
  // Prefer modern dollar fields; legacy integer fields are cents. Never use last trade.
  const p = number(market[`${side}_ask_dollars`]) ?? ((number(market[`${side}_ask`]) ?? NaN)/100);
  if (!(p > 0 && p < 1)) return null;
  const directSize = number(market[`${side}_ask_size_fp`]);
  const size = directSize ?? number(market[`${side === 'yes' ? 'no' : 'yes'}_bid_size_fp`]);
  if (size !== null && size <= 0) return null;
  return {price:p, cents:Number((p*100).toFixed(4)), payoutMultiplier:priceToMultiplier(p), payoutMultiplierLabel:multiplierLabel(p), american:priceToAmerican(p), eligible:withinOdds(p,filter), size};
}
