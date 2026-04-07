import { supabase } from './supabaseClient';
import { Slide, EditorSession } from '../types';

function getSessionToken(): string {
  let token = localStorage.getItem('cardnews_session_token');
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem('cardnews_session_token', token);
  }
  return token;
}

export async function saveSession(
  slides: Slide[],
  caption: string,
  extractedStyles: string,
  existingId?: string
): Promise<string | null> {
  const token = getSessionToken();
  const title = `슬라이드 ${slides.length}장 · ${new Date().toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;

  if (existingId) {
    const { error } = await supabase
      .from('editor_sessions')
      .update({
        title,
        slides_json: slides,
        caption,
        extracted_styles: extractedStyles,
        slide_count: slides.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingId);
    if (error) { console.error(error); return null; }
    return existingId;
  }

  const { data, error } = await supabase
    .from('editor_sessions')
    .insert({
      session_token: token,
      title,
      slides_json: slides,
      caption,
      extracted_styles: extractedStyles,
      slide_count: slides.length,
    })
    .select('id')
    .maybeSingle();

  if (error) { console.error(error); return null; }
  return data?.id ?? null;
}

export async function loadSessions(): Promise<EditorSession[]> {
  const token = getSessionToken();
  const { data, error } = await supabase
    .from('editor_sessions')
    .select('id, title, slide_count, caption, slides_json, extracted_styles, created_at, updated_at')
    .eq('session_token', token)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) { console.error(error); return []; }
  return (data ?? []) as EditorSession[];
}

export async function deleteSession(id: string): Promise<void> {
  await supabase.from('editor_sessions').delete().eq('id', id);
}
