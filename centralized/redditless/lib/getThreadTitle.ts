export function getThreadTitle(p: string) {
  if (!p || typeof p !== 'string') {
    console.log('getThreadTitle: No valid string provided');
    return ['[No title]', ''] as const;
  }
  
  // Split into lines and get the first line as title
  const lines = p.split('\n');
  const firstLine = (lines[0] || '').trim();
  
  // The body is everything after the first line
  const body = lines.slice(1).join('\n').trim();
  
  // Return a fallback title if the first line is empty
  const finalTitle = firstLine || '[Untitled]';
  
  console.log('getThreadTitle: Raw title:', finalTitle);
  console.log('getThreadTitle: Body length:', body.length);
  
  return [finalTitle, body] as const;
}
