<?php
namespace Dyscover;
use Dompdf\Dompdf;
use Dompdf\Options;
use Nesh\Identity;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Validate;
require_once __DIR__ . '/posts.php';
class ArticlePdfExport
{
    public static function stream(string $uuid): void
    {
        Request::get();
        Identity::required();
        $uuid = trim($uuid);
        if (!Validate::required($uuid)) {
            Response::badRequest('Missing article uuid');
        }
        $post = Query::fetch(
            "SELECT p.id, p.user_id, p.uuid, p.title, p.status
            FROM ielectro_dyscover.dyscover_posts p
            WHERE p.uuid = ?
            AND p.type = 'article'
            LIMIT 1",
            [$uuid]
        );
        if (!$post || $post['status'] !== 'active') {
            Response::notFound('Article not found');
        }
        if (!self::isOwner((int) $post['user_id'])) {
            Response::forbidden();
        }
        $path = PostAssets::articlePath((int) $post['user_id'], (string) $post['uuid']);
        if (!is_file($path)) {
            Response::notFound('Article not found');
        }
        $content = (string) file_get_contents($path);
        $title = (string) ($post['title'] ?? 'Article');
        $html = self::buildDocument($title, $content);
        if (!is_file(NESH_PATH . '/vendor/autoload.php')) {
            Response::error('PDF export unavailable');
        }
        require_once NESH_PATH . '/vendor/autoload.php';
        $options = new Options();
        $options->set('isRemoteEnabled', false);
        $options->set('isHtml5ParserEnabled', true);
        $options->set('defaultFont', 'DejaVu Sans');
        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();
        $filename = self::fileName($title);
        header('Content-Type: application/pdf');
        header('Content-Disposition: ' . self::contentDisposition($filename));
        header('Cache-Control: private, max-age=0, must-revalidate');
        echo $dompdf->output();
        exit;
    }
    private static function isOwner(int $postUserId): bool
    {
        $accountId = Identity::id();
        if ($accountId === null) {
            return false;
        }
        $owner = Query::fetch(
            'SELECT id FROM ielectro_dyscover.dyscover_users WHERE account_id = ? LIMIT 1',
            [$accountId]
        );
        return $owner && (int) $owner['id'] === $postUserId;
    }
    private static function buildDocument(string $title, string $content): string
    {
        $safeTitle = htmlspecialchars($title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $body = self::prepareContent($content);
        return '<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>' . self::styles() . '</style>
</head>
<body>
<h1 class="title">' . $safeTitle . '</h1>
<div class="content">' . $body . '</div>
</body>
</html>';
    }
    private static function prepareContent(string $html): string
    {
        $html = preg_replace('/<script\b[^>]*>.*?<\/script>/is', '', $html) ?? $html;
        $html = preg_replace('/<style\b[^>]*>.*?<\/style>/is', '', $html) ?? $html;
        $html = preg_replace('/\scontenteditable=(["\']).*?\1/i', '', $html) ?? $html;
        $html = preg_replace('/<img\b[^>]*>/i', '', $html) ?? $html;
        $html = preg_replace('/<figure\b[^>]*>.*?<\/figure>/is', '', $html) ?? $html;
        $html = preg_replace('/<(?:video|audio)\b[^>]*>.*?<\/(?:video|audio)>/is', '', $html) ?? $html;
        $html = preg_replace('/<(?:video|audio)\b[^>]*\/?>/i', '', $html) ?? $html;
        $html = preg_replace(
            '/<[^>]+class=(["\'])[^"\']*\bmenu\b[^"\']*\1[^>]*>.*?<\/[^>]+>/is',
            '',
            $html
        ) ?? $html;
        $html = self::simplifyLegendAndPercentage($html);
        $html = self::stripEmptyBlocks($html);
        $html = self::stripEmptyTemplateRows($html);
        return self::absolutizeUrls($html);
    }
    private static function simplifyLegendAndPercentage(string $html): string
    {
        if (trim($html) === '') {
            return $html;
        }
        $doc = new \DOMDocument();
        libxml_use_internal_errors(true);
        $doc->loadHTML(
            '<?xml encoding="UTF-8"?><div id="pdf-root">' . $html . '</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
        );
        libxml_clear_errors();
        $root = $doc->getElementById('pdf-root');
        if (!$root instanceof \DOMElement) {
            return $html;
        }
        self::replaceElementsByClass($doc, $root, 'legend', static function (\DOMElement $element): string {
            foreach ($element->getElementsByTagName('*') as $node) {
                if ($node instanceof \DOMElement && self::hasClass($node, 'legend-text')) {
                    return trim($node->textContent);
                }
            }
            return trim($element->textContent);
        });
        self::replaceElementsByClass($doc, $root, 'percentage', static function (\DOMElement $element): string {
            $display = trim((string) $element->getAttribute('data-percentage'));
            if ($display !== '') {
                return $display;
            }
            $value = trim((string) $element->getAttribute('data-value'));
            if ($value === '') {
                return '';
            }
            if (str_contains($value, '/')) {
                return $value;
            }
            $number = (float) $value;
            if (!is_finite($number)) {
                return $value;
            }
            return (string) round($number) . '%';
        });
        $result = '';
        foreach ($root->childNodes as $child) {
            $result .= $doc->saveHTML($child);
        }
        return $result;
    }
    private static function hasClass(\DOMElement $element, string $class): bool
    {
        return preg_match('/\b' . preg_quote($class, '/') . '\b/', $element->getAttribute('class') ?? '') === 1;
    }
    private static function replaceElementsByClass(
        \DOMDocument $doc,
        \DOMElement $root,
        string $className,
        callable $textExtractor
    ): void {
        $xpath = new \DOMXPath($doc);
        $nodes = $xpath->query(
            './/*[contains(concat(" ", normalize-space(@class), " "), " ' . $className . ' ")]',
            $root
        );
        if ($nodes === false) {
            return;
        }
        $targets = [];
        foreach ($nodes as $node) {
            if ($node instanceof \DOMElement && self::hasClass($node, $className)) {
                $targets[] = $node;
            }
        }
        foreach ($targets as $element) {
            $text = trim((string) $textExtractor($element));
            $parent = $element->parentNode;
            if ($parent === null) {
                continue;
            }
            if ($text === '') {
                $parent->removeChild($element);
                continue;
            }
            $span = $doc->createElement('span');
            $span->setAttribute('class', 'pdf-text');
            $span->appendChild($doc->createTextNode($text));
            $parent->replaceChild($span, $element);
        }
    }
    private static function stripEmptyBlocks(string $html): string
    {
        $html = preg_replace('/^(?:\s|<p[^>]*>\s*(?:<br\s*\/?>)?\s*<\/p>)+/i', '', $html) ?? $html;
        $html = preg_replace('/<p[^>]*>\s*(?:<br\s*\/?>)?\s*<\/p>/i', '', $html) ?? $html;
        return $html;
    }
    private static function stripEmptyTemplateRows(string $html): string
    {
        return (string) preg_replace_callback(
            '/<tr\b[^>]*>(.*?)<\/tr>/is',
            static function (array $matches): string {
                $text = trim(strip_tags($matches[1]));
                return $text === '' ? '' : $matches[0];
            },
            $html
        );
    }
    private static function absolutizeUrls(string $html): string
    {
        $base = rtrim((string) APP_URL, '/');
        return (string) preg_replace_callback(
            '/\s(src|href)=(["\'])([^"\']+)\2/i',
            static function (array $matches) use ($base): string {
                $attr = $matches[1];
                $quote = $matches[2];
                $url = trim($matches[3]);
                if ($url === '' || str_starts_with($url, 'data:')) {
                    return $matches[0];
                }
                if (str_starts_with($url, '//')) {
                    $url = 'https:' . $url;
                } elseif (str_starts_with($url, '/')) {
                    $url = $base . $url;
                } elseif (!preg_match('#^https?://#i', $url)) {
                    $url = $base . '/' . ltrim($url, '/');
                }
                return ' ' . $attr . '=' . $quote . htmlspecialchars($url, ENT_QUOTES, 'UTF-8') . $quote;
            },
            $html
        );
    }
    private static function styles(): string
    {
        return <<<'CSS'
body {
    font-family: DejaVu Sans, sans-serif;
    font-size: 11pt;
    line-height: 1.55;
    color: #1e293b;
    margin: 0;
    padding: 0;
}
.title {
    font-size: 22pt;
    line-height: 1.2;
    color: #0b1f3a;
    margin: 0 0 10pt;
    page-break-after: avoid;
}
.content {
    width: 100%;
}
.paragraph {
    margin: 0 0 10pt;
}
.heading {
    font-size: 16pt;
    font-weight: bold;
    color: #0f172a;
    margin: 16pt 0 8pt;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 4pt;
}
.sub-heading {
    font-size: 13pt;
    font-weight: bold;
    color: #1e3a5f;
    margin: 14pt 0 8pt;
    border-left: 3px solid #1565c0;
    padding-left: 8pt;
}
.caption {
    margin: 0 0 10pt;
    padding: 6pt 8pt;
    border-left: 2px solid #93c5fd;
    color: #475569;
    font-style: italic;
}
.point-list, .number-list {
    margin: 8pt 0 12pt 18pt;
    padding: 0;
}
.bold { font-weight: bold; }
.italic { font-style: italic; }
.link { color: #1565c0; text-decoration: none; }
.pdf-text {
    font: inherit;
    color: inherit;
}
table {
    width: 100%;
    border-collapse: collapse;
    margin: 10pt 0 14pt;
}
table.template {
    width: 100%;
    border: 1px solid #cbd5e1;
    page-break-inside: auto;
}
table.template td,
table.template th {
    border-bottom: 1px solid #e2e8f0;
    padding: 7pt 8pt;
    vertical-align: top;
}
table.template thead th {
    background: #1565c0;
    color: #fff;
    font-weight: bold;
    text-align: center;
}
.template-cell-label {
    font-weight: bold;
    white-space: nowrap;
}
.template-cell-info {
    list-style: none;
    margin: 0;
    padding: 0;
}
.template-cell-info li {
    margin: 0 0 4pt;
}
.table {
    width: 100%;
    border: 1px solid #cbd5e1;
}
.table td, .table th {
    border: 1px solid #e2e8f0;
    padding: 6pt 7pt;
}
CSS;
    }
    private static function fileName(string $title): string
    {
        $base = trim($title);
        $base = preg_replace('/[<>:"\/\\\\|?*\x00-\x1f]/u', '', $base) ?? '';
        if ($base === '') {
            $base = 'Article';
        }
        if (strlen($base) > 120) {
            $base = substr($base, 0, 120);
        }
        return $base . ' - iElectro Dyscover.pdf';
    }
    private static function contentDisposition(string $filename): string
    {
        $ascii = preg_replace('/[^\x20-\x7E]/', '_', $filename) ?? 'Article - iElectro Dyscover.pdf';
        $ascii = str_replace('"', '', $ascii);
        return 'attachment; filename="' . $ascii . '"; filename*=UTF-8\'\'' . rawurlencode($filename);
    }
}
