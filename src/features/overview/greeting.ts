export function greetingFor(hour: number) {
  if (hour < 5) return '夜深了'
  if (hour < 11) return '早上好'
  if (hour < 13) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

/** A kaomoji to match the greeting's time of day. */
export function faceFor(hour: number) {
  if (hour < 5) return '(´-ω-`)'
  if (hour < 11) return '(๑•̀ㅂ•́)و'
  if (hour < 13) return '(｡･ω･｡)'
  if (hour < 18) return '(｡•̀ᴗ-)✧'
  return '(≧▽≦)'
}
