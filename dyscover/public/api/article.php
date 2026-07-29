<?php
namespace Dyscover;
use Nesh\File;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Session;
use Nesh\Validate;
class Article
{
    private static function path($userId)
    {
        return '../../u/'.$userId.'/article/';
    }
    private static function cleanHTML($html)
    {
        libxml_use_internal_errors(true);
        $dom = new DOMDocument('1.0', 'UTF-8');
        $dom->loadHTML(
            mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8'),
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
        );
        libxml_clear_errors();
        foreach ($dom->getElementsByTagName('*') as $element) {
            if ($element instanceof DOMElement && $element->hasAttribute('contenteditable')) {
                $element->removeAttribute('contenteditable');
            }
        }
        foreach (iterator_to_array($dom->getElementsByTagName('p')) as $p) {
            if (trim(strip_tags($p->textContent)) === '') {
                $p->parentNode->removeChild($p);
            }
        }
        $html = $dom->saveHTML();
        if (function_exists('tidy_repair_string')) {
            $config = [
                'indent' => true,
                'indent-spaces' => 4,
                'wrap' => 0,
                'show-body-only' => true,
                'clean' => true,
                'output-html' => true,
                'drop-empty-elements' => false
            ];
            $tidy = tidy_repair_string($html, $config, 'utf8');
            if ($tidy) {
                $html = $tidy;
            }
        }
        return trim($html);
    }
    public static function create(mixed $arg1, mixed $arg2) {
        $path = self::path($userId);
        if (!is_dir($path)) {
            mkdir($path, 0755, true);
        }
        file_put_contents(
            $path.$file,
            '<p class="paragraph">Start editing your content...</p>'
        );
    }
    public static function edit() {
        Request::allow(['PUT']);
        Auth::requireLogin();
        $file = trim((string) Request::value('file'));
        $content = (string) Request::value('content');
        if ($file === '' || $content === '') {
            Response::badRequest('Missing data');
        }
        $post = Query::fetch(
            'SELECT user_id,file
            FROM dyscover_posts
            WHERE type = ?
            AND file = ?
            LIMIT 1',
            ['article', $file]
        );
        if (!$post) {
            Response::notFound('Article not found');
        }
        $path = '../../u/'.$post['user_id'].'/article/'.$post['file'];
        if (!file_exists($path)) {
            Response::notFound('Article file not found');
        }
        file_put_contents(
            $path,
            self::cleanHTML($content)
        );
        Response::success('Article updated');
    }
    public static function delete(mixed $arg1, mixed $arg2) {
        $path = self::path($userId).$file;
        if (file_exists($path)) {
            unlink($path);
        }
    }
    public static function removeInArticles(mixed $arg1) {
        $file = pathinfo($file, PATHINFO_FILENAME);
        foreach (glob('../../u/*/article/*.html') as $article) {
            $html = file_get_contents($article);
            libxml_use_internal_errors(true);
            $dom = new DOMDocument();
            $dom->loadHTML(
                $html,
                LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
            );
            libxml_clear_errors();
            $xpath = new DOMXPath($dom);
            foreach ($xpath->query('//a[@href]') as $node) {
                if ($node->getAttribute('href') === APP_URL.'/article/'.$file) {
                    $node->parentNode->removeChild($node);
                }
            }
            foreach ($xpath->query('//*[@src]') as $node) {
                if ($node->getAttribute('src') === APP_URL.'/article/'.$file) {
                    $node->parentNode->removeChild($node);
                }
            }
            foreach ($xpath->query('//*[@data-file="'.$file.'.html"]') as $node) {
                $node->parentNode->removeChild($node);
            }
            $updated = $dom->saveHTML();
            if ($updated !== $html) {
                file_put_contents($article, $updated);
            }
        }
    }
    public static function info() {
        Request::allow(['GET']);
        $file = trim((string) Request::value('file'));
        if ($file === '') {
            Response::badRequest('Missing file');
        }
        $post = Query::fetch(
            'SELECT id,user_id,title,file
            FROM dyscover_posts
            WHERE file = ?
            AND type = ?
            AND status = ?
            LIMIT 1',
            [
                $file,
                'article',
                'active'
            ]
        );
        if (!$post) {
            Response::notFound('Article not found');
        }
        $path = '../../u/'.$post['user_id'].'/article/'.$post['file'];
        if (!file_exists($path)) {
            Response::notFound('File not found');
        }
        $tags = Query::fetchAll(
            'SELECT t.name
            FROM dyscover_tags t
            INNER JOIN dyscover_post_tags pt ON pt.tag_id = t.id
            WHERE pt.post_id = ?
            ORDER BY t.name ASC',
            [
                $post['id']
            ]
        );
        Response::success('OK', [
            'title' => $post['title'],
            'file' => $post['file'],
            'content' => file_get_contents($path),
            'tags' => array_column($tags, 'name')
        ]);
    }
    public static function authorize() {
        Request::allow(['GET']);
        Auth::requireLogin();
        $file = trim((string) Request::value('file'));
        if ($file === '') {
            Response::badRequest('Missing file');
        }
        $post = Query::fetch(
            'SELECT user_id
            FROM dyscover_posts
            WHERE type = ?
            AND file = ?
            AND status = ?
            LIMIT 1',
            [
                'article',
                $file,
                'active'
            ]
        );
        if (!$post) {
            Response::notFound('Article not found');
        }
        Response::success('OK', [
            'authorized' => (int) $post['user_id'] === (int) Session::id()
        ]);
    }
    public static function preview() {
        Request::allow(['GET']);
        $file = trim((string) Request::value('file'));
        if ($file === '') {
            Response::badRequest('Missing file');
        }
        $post = Query::fetch(
            'SELECT user_id,preview_image,file
            FROM dyscover_posts
            WHERE file = ?
            AND type = ?
            AND status = ?
            LIMIT 1',
            [
                $file,
                'article',
                'active'
            ]
        );
        if (!$post) {
            Response::notFound('Article not found');
        }
        $path = '../../u/'.$post['user_id'].'/article/'.$post['file'];
        if (!file_exists($path)) {
            Response::notFound('File not found');
        }
        $html = file_get_contents($path);
        libxml_use_internal_errors(true);
        $dom = new DOMDocument();
        $dom->loadHTML(
            $html,
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
        );
        libxml_clear_errors();
        $text = '';
        foreach ($dom->getElementsByTagName('p') as $p) {
            $value = trim($p->textContent);
            if ($value !== '') {
                $text = $value;
                break;
            }
        }
        Response::success('OK', [
            'text' => $text,
            'status' => $post['preview_image'] !== '',
            'url' => $post['preview_image']
        ]);
    }
}
class Generate
{
    public static function init() {
        Request::allow(['POST']);
        $prompt = Request::value("prompt");
        $dictionary = file_get_contents("../../data/elements-dictionary.json");
        $dictionary = json_decode($dictionary, true);
        if (!Validate::required($prompt) || !is_array($dictionary)) {
            Response::badRequest("Invalid data");
        }
        $result = self::ai($prompt, $dictionary);
        if (!$result) {
            Response::error("Generate failed");
        }
        Response::success("Generated", [
            "json" => $result
        ]);
    }
    private static function ai($prompt, $dictionary)
    {
        $system = "
        You generate complete Wikipedia-style article JSON.
        Your task is to create the full article requested by the user.
        IMPORTANT:
        - Never return only one element.
        - Always return an array with many elements.
        - The first element should normally be a template.
        - Continue with the article body.
        - Use children for nested elements.
        Return ONLY valid JSON.
        Allowed elements:
        ".json_encode($dictionary, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $data = [
            "model" => "qwen2.5-coder:14b",
            "stream" => false,
            "format" => "json",
            "options" => [
                "temperature" => 0.2
            ],
            "prompt" => $system."\n\nUser request:\n".$prompt
        ];
        $ch = curl_init("http://localhost:11434/api/generate");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_TIMEOUT => 300,
            CURLOPT_HTTPHEADER => [
                "Content-Type: application/json"
            ],
            CURLOPT_POSTFIELDS => json_encode($data)
        ]);
        $response = curl_exec($ch);
        if (curl_errno($ch)) {
            curl_close($ch);
            return null;
        }
        curl_close($ch);
        $response = json_decode($response, true);
        if (!isset($response['response'])) {
            return null;
        }
        $json = json_decode(trim($response['response']), true);
        if (!is_array($json)) {
            return null;
        }
        if (isset($json['element'])) {
            $json = [$json];
        }
        return $json;
    }
}
