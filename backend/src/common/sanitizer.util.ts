import DOMPurify from 'isomorphic-dompurify';

/**
 * Безпечна санітизація HTML контенту
 * Використовується для очищення user input перед збереженням в БД
 */
export class SanitizerUtil {
  /**
   * Санітизує HTML з дозволеними тегами для product descriptions
   */
  static sanitizeProductDescription(html: string | null | undefined): string {
    if (!html) return '';

    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
  }

  /**
   * Видаляє всі HTML теги (для простого тексту)
   */
  static stripAllHtml(html: string | null | undefined): string {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '');
  }
}
