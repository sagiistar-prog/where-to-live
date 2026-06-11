export function redactSensitiveText(text: string) {
  return text
    .replace(/(?<!\d)1[3-9]\d{9}(?!\d)/g, "1**********")
    .replace(
      /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,
      (email) => `${email.slice(0, 2)}***@***`,
    )
    .replace(
      /\d{1,4}\s*(?:号楼|栋|幢|座)\s*(?:\d{1,3}\s*(?:单元|门))?\s*\d{2,4}\s*(?:室|房)/g,
      "[门牌已隐藏]",
    )
    .replace(
      /\d{1,4}\s*(?:弄|巷|号院|号)\s*\d{1,4}\s*(?:号|室|单元|门)/g,
      "[门牌已隐藏]",
    )
    .replace(
      /(?:房间|门牌|室号|户号)\s*[:：]?\s*[A-Za-z0-9-]{2,}/g,
      "[门牌已隐藏]",
    );
}
