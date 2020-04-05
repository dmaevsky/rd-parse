function equals(value, text, startIdx = 0, endIdx = Infinity) {
  if (len(text, startIdx, endIdx) < value.length) {
    return false;
  }

  let i;
  for (i = 0; i < value.length; i++) {
    const tIdx = startIdx + i;
    if (value[i] !== text[tIdx]) break;
  }
  return i === value.length;
}

function len(text, startIdx = 0, endIdx = Infinity) {
  return (endIdx === Infinity ? text.length : endIdx) - startIdx;
}

function indexOf(value, text, startIdx = 0, endIdx = Infinity) {
  const n = len(text, startIdx, endIdx) - value.length;
  for (let i = 0; i <= n; i++) {
    if (equals(value, text, startIdx + i, endIdx)) return i;
  }
  return undefined;
}

function indexOfAny(values, text, startIdx = 0, endIdx = Infinity) {
  for (let i = 0; i < values.length; i++) {
    let idx;
    if ((idx = indexOf(values[i], text, startIdx, endIdx)) >= 0) {
      return [idx, values[i].length];
    }
  }
  return [undefined, undefined];
}

module.exports = { equals, indexOf, indexOfAny };
