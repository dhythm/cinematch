/**
 * テキストをクリップボードへ書き込み、書き込めたかどうかを返す。
 *
 * Clipboard API は使えないことがある（http などの非セキュアな文脈、iframe、
 * プライベートブラウジングでの権限拒否など）ので、従来の execCommand('copy') に退避する。
 * どちらも駄目なら false を返し、呼び出し側が手動コピーへ誘導できるようにする。
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 権限や実行文脈の問題。フォールバックを試す
  }
  return copyWithExecCommand(text)
}

function copyWithExecCommand(text: string) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  // 画面外に置くとスクロール位置が飛ぶブラウザがあるので、見えない状態のまま画面内に置く
  textarea.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0'
  document.body.append(textarea)
  try {
    textarea.select()
    // 非推奨の API だが、Clipboard API が使えない環境ではこれしかない
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea.remove()
  }
}
