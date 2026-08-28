/**
 * [إصلاح] دالة تحويل Markdown إلى HTML — regex مُصلَح
 */
function md(mdText) {
  if (typeof mdText !== 'string') return '';
  let html = esc(mdText);
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  html = html.replace(/\n/g, '<br>');
  return html;
}
